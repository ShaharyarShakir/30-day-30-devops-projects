import json
import logging
from uuid import UUID, uuid4

from confluent_kafka import Consumer, KafkaException
from django.core.management.base import BaseCommand

from media.config.settings import settings
from media.video.domain.models import VideoMetadataORM

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Consume media.processing.finished events from Kafka and set video status to READY."

    def handle(self, *args, **options):
        self.stdout.write("Starting Kafka event consumer...")
        
        conf = {
            "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
            "group.id": "media-service-event-consumer",
            "auto.offset.reset": "earliest",
            "enable.auto.commit": True,
        }

        try:
            consumer = Consumer(conf)
        except Exception as e:
            self.stderr.write(f"Failed to initialize Kafka consumer: {e}")
            return

        topic = "media.processing.finished"
        consumer.subscribe([topic])
        self.stdout.write(f"Subscribed to topic: {topic}")

        try:
            while True:
                msg = consumer.poll(timeout=1.0)
                if msg is None:
                    continue

                if msg.error():
                    self.stderr.write(f"Kafka consumer error: {msg.error()}")
                    continue

                try:
                    payload = json.loads(msg.value().decode("utf-8"))
                    self.stdout.write(f"Received event: {payload}")

                    media_id_str = payload.get("mediaId") or payload.get("media_id")
                    if not media_id_str:
                        self.stderr.write("Missing mediaId in event payload")
                        continue

                    try:
                        media_id = UUID(media_id_str)
                    except ValueError:
                        self.stderr.write(f"Invalid mediaId UUID: {media_id_str}")
                        continue

                    duration = int(payload.get("duration", 0))
                    playlist = payload.get("playlist", "")

                    thumbnail_key = f"media/{media_id}/thumbs/cover.jpg"
                    preview_sprite_key = f"media/{media_id}/thumbs/sprite.jpg"

                    # Create or update VideoMetadataORM record
                    video_meta, created = VideoMetadataORM.objects.get_or_create(
                        media_id=media_id,
                        defaults={
                            "id": uuid4(),
                            "duration": duration,
                            "master_playlist_key": playlist,
                            "thumbnail_key": thumbnail_key,
                            "preview_sprite_key": preview_sprite_key,
                            "status": "READY",
                        },
                    )

                    if not created:
                        video_meta.duration = duration
                        video_meta.master_playlist_key = playlist
                        video_meta.thumbnail_key = thumbnail_key
                        video_meta.preview_sprite_key = preview_sprite_key
                        video_meta.status = "READY"
                        video_meta.save()

                    action = "Created" if created else "Updated"
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Successfully {action} VideoMetadataORM for media_id: {media_id} (status=READY)"
                        )
                    )

                except Exception as ex:
                    self.stderr.write(f"Failed to process message: {ex}")

        except KeyboardInterrupt:
            self.stdout.write("Shutting down consumer...")
        finally:
            consumer.close()
            self.stdout.write("Consumer stopped.")
