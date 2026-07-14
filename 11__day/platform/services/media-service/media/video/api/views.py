from datetime import timedelta
from uuid import UUID

from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from media.upload.infrastructure.garage_storage import GarageObjectStorage
from media.video.api.serializers import (
    PlaybackResponseSerializer,
    ProgressUpdateRequestSerializer,
    WatchProgressSerializer,
)
from media.video.application.services import VideoPlaybackService, WatchProgressService
from media.video.domain.entities import ProgressUpdateRequest
from media.video.domain.models import CaptionORM, VideoMetadataORM
from media.video.infrastructure.storage import CDNURLBuilder, SignedURLGenerator


class VideoPlayView(APIView):
    """Get signed HLS master playlist URL and metadata for a video."""
    permission_classes = [IsAuthenticated]

    def get(self, request, video_id: str) -> Response:
        try:
            media_id = UUID(video_id)
        except ValueError:
            return Response({"error": "Invalid video ID"}, status=status.HTTP_400_BAD_REQUEST)

        # Get lesson ID from query parameters or fallback to media_id
        lesson_id_str = request.query_params.get("lessonId")
        if lesson_id_str:
            try:
                lesson_id = UUID(lesson_id_str)
            except ValueError:
                return Response({"error": "Invalid lesson ID"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            lesson_id = media_id  # Fallback

        playback_service = VideoPlaybackService()

        # Check if user is staff/instructor/admin (bypasses enrollment)
        is_instructor_or_admin = getattr(request.user, "is_staff", False)
        if not is_instructor_or_admin:
            # Check enrollment via DB helper
            if not playback_service._check_enrollment(request.user.id, lesson_id):
                return Response(
                    {"error": "Forbidden: You are not enrolled in this course"},
                    status=status.HTTP_403_FORBIDDEN
                )

        try:
            playback_info = playback_service.get_playback_url(
                user_id=request.user.id,
                media_id=media_id,
                lesson_id=lesson_id,
                bypass_enrollment=is_instructor_or_admin,
            )
        except ValueError as e:
            if "enrolled" in str(e).lower():
                return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

        # Build signed captions URLs
        url_generator = SignedURLGenerator()
        cdn_builder = CDNURLBuilder()
        signed_captions = []
        if playback_info.captions:
            for cap in playback_info.captions:
                base_cap_url = cdn_builder.build_caption_url(cap.storage_key)
                signed_cap_url = url_generator.generate_signed_url(base_cap_url, "")
                signed_captions.append({
                    "language": cap.language,
                    "url": signed_cap_url
                })

        # Build signed thumbnail URL
        signed_thumbnail = None
        if playback_info.thumbnail_url:
            signed_thumbnail = url_generator.generate_signed_url(playback_info.thumbnail_url, "")

        response_data = {
            "media_id": playback_info.media_id,
            "status": playback_info.status.value,
            "duration": playback_info.duration,
            "playlist_url": playback_info.playlist_url,
            "thumbnail_url": signed_thumbnail,
            "captions": signed_captions,
        }

        serializer = PlaybackResponseSerializer(response_data)
        return Response(serializer.data)


class WatchProgressUpdateView(APIView):
    """Record watch progress coordinates for a lesson."""
    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        serializer = ProgressUpdateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        update_req = ProgressUpdateRequest(
            lesson_id=data["lesson_id"],
            position=data["position"],
            duration=data["duration"],
        )

        progress_service = WatchProgressService()
        try:
            progress = progress_service.update_progress(
                user_id=request.user.id,
                request=update_req,
                event=data.get("event")
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response_serializer = WatchProgressSerializer(progress)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class WatchProgressDetailView(APIView):
    """Retrieve current watch progress coordinates for a lesson."""
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id: str) -> Response:
        try:
            lesson_id_uuid = UUID(lesson_id)
        except ValueError:
            return Response({"error": "Invalid lesson ID"}, status=status.HTTP_400_BAD_REQUEST)

        progress_service = WatchProgressService()
        progress = progress_service.get_progress(user_id=request.user.id, lesson_id=lesson_id_uuid)

        if not progress:
            return Response({
                "position": 0,
                "duration": 0,
                "completed": False
            })

        serializer = WatchProgressSerializer(progress)
        return Response(serializer.data)


class VideoCaptionsView(APIView):
    """List captions with short-lived signed URLs for a video."""
    permission_classes = [IsAuthenticated]

    def get(self, request, video_id: str) -> Response:
        try:
            media_id = UUID(video_id)
        except ValueError:
            return Response({"error": "Invalid video ID"}, status=status.HTTP_400_BAD_REQUEST)

        caption_orms = CaptionORM.objects.filter(media_id=media_id)
        cdn_builder = CDNURLBuilder()
        url_generator = SignedURLGenerator()

        results = []
        for orm in caption_orms:
            base_url = cdn_builder.build_caption_url(orm.storage_key)
            signed_url = url_generator.generate_signed_url(base_url, "")
            results.append({
                "id": str(orm.id),
                "mediaId": str(orm.media_id),
                "language": orm.language,
                "label": orm.label,
                "format": orm.format,
                "url": signed_url
            })

        return Response(results)


class VideoThumbnailView(APIView):
    """Redirect to a signed URL of the default video thumbnail cover."""
    permission_classes = [IsAuthenticated]

    def get(self, request, video_id: str) -> Response:
        try:
            media_id = UUID(video_id)
        except ValueError:
            return Response({"error": "Invalid video ID"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            video_meta = VideoMetadataORM.objects.get(media_id=media_id)
        except VideoMetadataORM.DoesNotExist:
            return Response({"error": "Video not found"}, status=status.HTTP_404_NOT_FOUND)

        if not video_meta.thumbnail_key:
            return Response({"error": "Thumbnail not available"}, status=status.HTTP_404_NOT_FOUND)

        cdn_builder = CDNURLBuilder()
        url_generator = SignedURLGenerator()
        base_url = cdn_builder.build_thumbnail_url(video_meta.thumbnail_key)
        signed_url = url_generator.generate_signed_url(base_url, "")

        return HttpResponseRedirect(signed_url)


class ServeMediaFileView(APIView):
    """Secure proxy layer validating URL signature and redirecting to short-lived S3 URLs."""
    permission_classes = [AllowAny]  # Authentication is performed via HMAC signed URL check

    def get(self, request, storage_key: str) -> Response:
        # Reconstruct absolute URI to verify HMAC signature
        url_generator = SignedURLGenerator()
        if not url_generator.verify_signed_url(request.build_absolute_uri()):
            return Response(
                {"error": "Unauthorized: Invalid or expired signature token"},
                status=status.HTTP_403_FORBIDDEN
            )

        storage = GarageObjectStorage()

        # Locate correct S3 storage key
        s3_key = storage_key
        # Check direct key existence first
        if not storage.object_exists(s3_key):
            # Prepend media/ prefix if required
            if not s3_key.startswith("media/"):
                prefixed_key = f"media/{s3_key}"
                if storage.object_exists(prefixed_key):
                    s3_key = prefixed_key
                else:
                    return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
            else:
                # Strip out first media/ segment if it is a duplicate bucket path prefix
                # e.g., media/media/123/master.m3u8 -> media/123/master.m3u8
                parts = s3_key.split("/", 1)
                if len(parts) > 1 and parts[0] == "media":
                    sub_key = parts[1]
                    if storage.object_exists(sub_key):
                        s3_key = sub_key
                    else:
                        return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
                else:
                    return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)

        # Generate a short-lived (60 seconds) pre-signed URL to S3
        download_url = storage.create_download_url(s3_key, timedelta(seconds=60))
        return HttpResponseRedirect(download_url)
