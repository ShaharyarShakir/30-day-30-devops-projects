import json
from uuid import UUID

from confluent_kafka import Producer

from media.config.settings import settings


class KafkaPublisher:
    """Kafka event publisher."""

    def __init__(self):
        self.producer = Producer(
            {
                "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
            }
        )

    def publish_upload_completed(
        self, media_id: UUID, storage_key: str, owner_id: UUID
    ) -> None:
        """Publish media.upload.completed event."""
        topic = settings.KAFKA_TOPIC_UPLOAD_COMPLETED
        payload = {
            "mediaId": str(media_id),
            "storageKey": storage_key,
            "ownerId": str(owner_id),
        }
        self.producer.produce(topic, json.dumps(payload).encode("utf-8"))
        self.producer.flush()
