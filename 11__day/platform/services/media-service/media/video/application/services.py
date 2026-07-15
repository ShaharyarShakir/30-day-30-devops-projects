import json
from datetime import datetime
from uuid import UUID, uuid4

from confluent_kafka import Producer
from django.db import transaction

from media.config.settings import settings
from media.video.domain.entities import (
    Caption,
    PlaybackResponse,
    ProgressUpdateRequest,
    VideoMetadata,
    VideoStatus,
    WatchProgress,
)
from media.video.domain.models import CaptionORM, VideoMetadataORM, WatchProgressORM
from media.video.infrastructure.storage import CDNURLBuilder, SignedURLGenerator


class KafkaAnalyticsProducer:
    """Publish playback analytics events to Kafka."""

    def __init__(self):
        self.producer = Producer(
            {
                "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "client.id": "media-service-analytics",
            }
        )

    def _delivery_report(self, err, msg):
        """Callback for Kafka delivery reports."""
        if err is not None:
            print(f"Message delivery failed: {err}")
        else:
            print(f"Message delivered to {msg.topic()} [{msg.partition()}]")

    def publish_event(self, topic: str, event_data: dict):
        """Publish an event to Kafka."""
        try:
            self.producer.produce(
                topic,
                key=str(event_data.get("user_id")),
                value=json.dumps(event_data),
                callback=self._delivery_report,
            )
            self.producer.flush(timeout=1.0)
        except Exception as e:
            print(f"Failed to publish event to Kafka: {e}")

    def publish_playback_started(self, user_id: UUID, lesson_id: UUID, media_id: UUID):
        """Publish playback started event."""
        event = {
            "event_type": "media.play.started",
            "user_id": str(user_id),
            "lesson_id": str(lesson_id),
            "media_id": str(media_id),
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.publish_event("media.play.started", event)

    def publish_playback_paused(self, user_id: UUID, lesson_id: UUID, media_id: UUID, position: int):
        """Publish playback paused event."""
        event = {
            "event_type": "media.play.paused",
            "user_id": str(user_id),
            "lesson_id": str(lesson_id),
            "media_id": str(media_id),
            "position": position,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.publish_event("media.play.paused", event)

    def publish_lesson_completed(self, user_id: UUID, lesson_id: UUID, media_id: UUID):
        """Publish lesson completed event."""
        event = {
            "event_type": "media.lesson.completed",
            "user_id": str(user_id),
            "lesson_id": str(lesson_id),
            "media_id": str(media_id),
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.publish_event("media.lesson.completed", event)

    def publish_progress_updated(
        self, user_id: UUID, lesson_id: UUID, media_id: UUID, position: int, duration: int
    ):
        """Publish progress updated event."""
        event = {
            "event_type": "media.progress.updated",
            "user_id": str(user_id),
            "lesson_id": str(lesson_id),
            "media_id": str(media_id),
            "position": position,
            "duration": duration,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.publish_event("media.progress.updated", event)


class VideoPlaybackService:
    """Service for video playback authorization and signed URL generation."""

    def __init__(self):
        self.url_generator = SignedURLGenerator()
        self.cdn_builder = CDNURLBuilder()
        self.analytics = KafkaAnalyticsProducer()

    def _check_enrollment(self, user_id: UUID, lesson_id: UUID) -> bool:
        """Check if user is enrolled in the course containing the lesson."""
        from django.db import connections
        try:
            with connections['course_db'].cursor() as cursor:
                cursor.execute(
                    """
                    SELECT EXISTS (
                        SELECT 1
                        FROM enrollments e
                        JOIN sections s ON s.course_id = e.course_id
                        JOIN lessons l ON l.section_id = s.id
                        WHERE e.user_id = %s AND l.id = %s
                    )
                    """,
                    [str(user_id), str(lesson_id)]
                )
                row = cursor.fetchone()
                return row[0] if row else False
        except Exception as e:
            # Fallback to True if database query fails or secondary connection is not ready
            print(f"Error checking enrollment in course_db: {e}")
            return True

    def get_playback_url(
        self, user_id: UUID, media_id: UUID, lesson_id: UUID, bypass_enrollment: bool = False
    ) -> PlaybackResponse:
        """Get signed playback URL for a video."""
        # Verify enrollment
        if not bypass_enrollment and not self._check_enrollment(user_id, lesson_id):
            raise ValueError("User not enrolled in this course")

        # Get video metadata
        try:
            video_meta = VideoMetadataORM.objects.get(media_id=media_id)
        except VideoMetadataORM.DoesNotExist:
            raise ValueError("Video not found")

        if video_meta.status != VideoStatus.READY.value:
            raise ValueError("Video is not ready for playback")

        # Generate signed URL for master playlist
        base_url = self.cdn_builder.build_playlist_url(video_meta.master_playlist_key)
        signed_url = self.url_generator.generate_signed_url(base_url, "master.m3u8")

        # Get thumbnail URL
        thumbnail_url = None
        if video_meta.thumbnail_key:
            thumbnail_url = self.cdn_builder.build_thumbnail_url(video_meta.thumbnail_key)

        # Get captions
        captions = self._get_captions(media_id)

        # Publish play started
        self.analytics.publish_playback_started(user_id, lesson_id, media_id)

        return PlaybackResponse(
            media_id=media_id,
            status=VideoStatus(video_meta.status),
            duration=video_meta.duration,
            playlist_url=signed_url,
            thumbnail_url=thumbnail_url,
            captions=captions,
        )

    def _get_captions(self, media_id: UUID) -> list[Caption]:
        """Get available captions for a video."""
        caption_orms = CaptionORM.objects.filter(media_id=media_id)
        captions = []
        for caption_orm in caption_orms:
            caption_url = self.cdn_builder.build_caption_url(caption_orm.storage_key)
            captions.append(
                Caption(
                    id=caption_orm.id,
                    media_id=caption_orm.media_id,
                    language=caption_orm.language,
                    label=caption_orm.label,
                    format=caption_orm.format,
                    storage_key=caption_orm.storage_key,
                    created_at=caption_orm.created_at,
                )
            )
        return captions

    def get_thumbnail_url(self, media_id: UUID) -> str:
        """Get thumbnail URL for a video."""
        try:
            video_meta = VideoMetadataORM.objects.get(media_id=media_id)
        except VideoMetadataORM.DoesNotExist:
            raise ValueError("Video not found")

        if not video_meta.thumbnail_key:
            raise ValueError("Thumbnail not available")

        return self.cdn_builder.build_thumbnail_url(video_meta.thumbnail_key)


class WatchProgressService:
    """Service for tracking watch progress."""

    def __init__(self):
        self.analytics = KafkaAnalyticsProducer()

    def _get_media_id_for_lesson(self, lesson_id: UUID) -> UUID:
        """Query course service database to find media ID from lesson resources."""
        from django.db import connections
        import re
        try:
            with connections['course_db'].cursor() as cursor:
                cursor.execute(
                    "SELECT url FROM lesson_resources WHERE lesson_id = %s AND LOWER(type) = 'video'",
                    [str(lesson_id)]
                )
                row = cursor.fetchone()
                if row:
                    url = row[0]
                    uuid_match = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', url, re.I)
                    if uuid_match:
                        return UUID(uuid_match.group(0))
        except Exception as e:
            print(f"Error resolving media ID for lesson in course_db: {e}")
        
        # Fallback: check if we have a VideoMetadataORM with this lesson_id as media_id
        if VideoMetadataORM.objects.filter(media_id=lesson_id).exists():
            return lesson_id
        return lesson_id

    def update_progress(self, user_id: UUID, request: ProgressUpdateRequest, event: str | None = None) -> WatchProgress:
        """Update watch progress for a lesson."""
        media_id = self._get_media_id_for_lesson(request.lesson_id)

        # Check if progress record exists
        try:
            progress = WatchProgressORM.objects.get(user_id=user_id, lesson_id=request.lesson_id)
            progress.media_id = media_id
        except WatchProgressORM.DoesNotExist:
            # Create new progress record
            progress = WatchProgressORM.objects.create(
                id=uuid4(),
                user_id=user_id,
                lesson_id=request.lesson_id,
                media_id=media_id,
                position=request.position,
                duration=request.duration,
                completed=False,
            )

        # Update progress
        progress.position = request.position
        progress.duration = request.duration
        progress.last_played_at = datetime.utcnow()

        # Check completion (90% threshold)
        completion_percentage = (request.position / request.duration) * 100 if request.duration > 0 else 0
        was_completed = progress.completed
        progress.completed = completion_percentage >= 90

        progress.save()

        # Handle specific analytics event triggers
        if event == "started":
            self.analytics.publish_playback_started(user_id, request.lesson_id, progress.media_id)
        elif event == "paused":
            self.analytics.publish_playback_paused(user_id, request.lesson_id, progress.media_id, request.position)
        else:
            # Default to publishing progress updated
            self.analytics.publish_progress_updated(
                user_id=user_id,
                lesson_id=request.lesson_id,
                media_id=progress.media_id,
                position=request.position,
                duration=request.duration,
            )

        # Publish lesson completion event if just completed
        if not was_completed and progress.completed:
            self.analytics.publish_lesson_completed(
                user_id=user_id,
                lesson_id=request.lesson_id,
                media_id=progress.media_id,
            )

        return self._convert_to_entity(progress)

    def get_progress(self, user_id: UUID, lesson_id: UUID) -> WatchProgress | None:
        """Get watch progress for a lesson."""
        try:
            progress = WatchProgressORM.objects.get(user_id=user_id, lesson_id=lesson_id)
            return self._convert_to_entity(progress)
        except WatchProgressORM.DoesNotExist:
            return None

    def _convert_to_entity(self, orm: WatchProgressORM) -> WatchProgress:
        """Convert ORM to entity."""
        return WatchProgress(
            id=orm.id,
            user_id=orm.user_id,
            lesson_id=orm.lesson_id,
            media_id=orm.media_id,
            position=orm.position,
            duration=orm.duration,
            completed=orm.completed,
            last_played_at=orm.last_played_at,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )
