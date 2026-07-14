from datetime import datetime, timedelta
from uuid import UUID, uuid4

from media.config.settings import settings
from media.upload.domain.entities import MediaFile, MediaStatus, UploadSession
from media.upload.domain.models import MediaFileORM, UploadSessionORM
from media.upload.domain.storage_key import generate_storage_key
from media.upload.infrastructure.garage_storage import GarageObjectStorage
from media.upload.infrastructure.kafka import KafkaPublisher


class UploadService:
    """Service for managing upload sessions and media files."""

    # Default part size for multipart uploads (100 MB)
    DEFAULT_PART_SIZE = 100 * 1024 * 1024

    def __init__(self):
        self.storage = GarageObjectStorage()
        self.kafka = KafkaPublisher()

    def create_multipart_upload_session(
        self, owner_id: UUID, filename: str, mime_type: str, size: int
    ) -> UploadSession:
        """Create a new multipart upload session."""
        media_id = uuid4()
        storage_key = generate_storage_key(filename)

        # Calculate part size and total parts
        part_size = self.DEFAULT_PART_SIZE
        total_parts = (size + part_size - 1) // part_size

        # Create media file record
        media_file = MediaFileORM.objects.create(
            id=media_id,
            owner_id=owner_id,
            filename=filename,
            mime_type=mime_type,
            size=size,
            storage_key=storage_key,
            status=MediaStatus.UPLOADING.value,
        )

        # Initialize multipart upload in storage
        upload_id = self.storage.create_multipart_upload(
            storage_key=storage_key,
            content_type=mime_type,
        )

        # Create upload session
        session_id = uuid4()
        expires_at = datetime.utcnow() + timedelta(
            hours=settings.UPLOAD_SESSION_EXPIRY_HOURS
        )

        upload_session = UploadSessionORM.objects.create(
            id=session_id,
            media_id=media_id,
            upload_id=upload_id,
            expires_at=expires_at,
            completed=False,
            part_size=part_size,
            total_parts=total_parts,
            uploaded_parts=0,
        )

        session = UploadSession(
            id=session_id,
            media_id=media_id,
            upload_id=upload_id,
            expires_at=expires_at.isoformat(),
            completed=False,
            part_size=part_size,
            total_parts=total_parts,
            uploaded_parts=0,
        )

        return session

    def get_upload_part_url(
        self, session_id: UUID, part_number: int, owner_id: UUID
    ) -> str:
        """Generate a pre-signed URL for uploading a specific part."""
        try:
            upload_session = UploadSessionORM.objects.get(id=session_id)
        except UploadSessionORM.DoesNotExist:
            raise ValueError("Upload session not found")

        # Verify ownership
        media_file = MediaFileORM.objects.get(id=upload_session.media_id)
        if media_file.owner_id != owner_id:
            raise ValueError("Unauthorized: You do not own this upload")

        # Validate part number
        if part_number < 1 or part_number > upload_session.total_parts:
            raise ValueError(f"Invalid part number: {part_number}")

        # Generate part URL
        part_url = self.storage.generate_upload_part_url(
            storage_key=media_file.storage_key,
            upload_id=upload_session.upload_id,
            part_number=part_number,
            expires_in=timedelta(hours=settings.UPLOAD_SESSION_EXPIRY_HOURS),
        )

        return part_url

    def complete_multipart_upload(
        self,
        session_id: UUID,
        owner_id: UUID,
        parts: list[dict],
        checksum: str | None = None,
    ) -> MediaStatus:
        """Complete a multipart upload with verification."""
        try:
            upload_session = UploadSessionORM.objects.get(id=session_id)
        except UploadSessionORM.DoesNotExist:
            raise ValueError("Upload session not found")

        # Verify ownership
        media_file = MediaFileORM.objects.get(id=upload_session.media_id)
        if media_file.owner_id != owner_id:
            raise ValueError("Unauthorized: You do not own this upload")

        # Verify all parts are uploaded
        if len(parts) != upload_session.total_parts:
            raise ValueError(
                f"Expected {upload_session.total_parts} parts, got {len(parts)}"
            )

        # Complete multipart upload in storage
        result = self.storage.complete_multipart_upload(
            storage_key=media_file.storage_key,
            upload_id=upload_session.upload_id,
            parts=parts,
        )

        # Verify object exists and get metadata
        metadata = self.storage.get_object_metadata(media_file.storage_key)
        if not metadata or metadata["size"] != media_file.size:
            raise ValueError("Upload verification failed: size mismatch")

        # Update media file with checksum if provided
        if checksum:
            media_file.checksum = checksum

        # Update status
        media_file.status = MediaStatus.UPLOADED.value
        media_file.save()

        # Mark session as completed
        upload_session.completed = True
        upload_session.uploaded_parts = upload_session.total_parts
        upload_session.save()

        # Publish Kafka event
        self.kafka.publish_upload_completed(
            media_id=media_file.id,
            storage_key=media_file.storage_key,
            owner_id=media_file.owner_id,
        )

        return MediaStatus.UPLOADED

    def abort_upload(self, session_id: UUID, owner_id: UUID) -> None:
        """Abort an upload session and clean up."""
        try:
            upload_session = UploadSessionORM.objects.get(id=session_id)
        except UploadSessionORM.DoesNotExist:
            raise ValueError("Upload session not found")

        # Verify ownership
        media_file = MediaFileORM.objects.get(id=upload_session.media_id)
        if media_file.owner_id != owner_id:
            raise ValueError("Unauthorized: You do not own this upload")

        # Abort multipart upload in storage if upload_id exists
        if upload_session.upload_id:
            self.storage.abort_multipart_upload(
                storage_key=media_file.storage_key,
                upload_id=upload_session.upload_id,
            )

        # Update media file status
        media_file.status = MediaStatus.FAILED.value
        media_file.save()

        # Delete upload session
        upload_session.delete()

    def create_upload_session(
        self, owner_id: UUID, filename: str, mime_type: str, size: int
    ) -> tuple[UploadSession, str]:
        """Create a new upload session and return session with upload URL."""
        media_id = uuid4()
        storage_key = generate_storage_key(filename)

        # Create media file record
        media_file = MediaFileORM.objects.create(
            id=media_id,
            owner_id=owner_id,
            filename=filename,
            mime_type=mime_type,
            size=size,
            storage_key=storage_key,
            status=MediaStatus.UPLOADING.value,
        )

        # Create upload session
        session_id = uuid4()
        upload_id = str(uuid4())
        expires_at = datetime.utcnow() + timedelta(
            hours=settings.UPLOAD_SESSION_EXPIRY_HOURS
        )

        upload_session = UploadSessionORM.objects.create(
            id=session_id,
            media_id=media_id,
            upload_id=upload_id,
            expires_at=expires_at,
            completed=False,
        )

        # Generate pre-signed upload URL
        upload_url = self.storage.create_upload_url(
            storage_key=storage_key,
            content_type=mime_type,
            expires_in=timedelta(hours=settings.UPLOAD_SESSION_EXPIRY_HOURS),
        )

        session = UploadSession(
            id=session_id,
            media_id=media_id,
            upload_id=upload_id,
            expires_at=expires_at.isoformat(),
            completed=False,
        )

        return session, upload_url

    def complete_upload(self, session_id: UUID, owner_id: UUID) -> MediaStatus:
        """Complete an upload session and publish Kafka event."""
        try:
            upload_session = UploadSessionORM.objects.get(id=session_id)
        except UploadSessionORM.DoesNotExist:
            raise ValueError("Upload session not found")

        # Verify ownership
        media_file = MediaFileORM.objects.get(id=upload_session.media_id)
        if media_file.owner_id != owner_id:
            raise ValueError("Unauthorized: You do not own this upload")

        # Verify object exists in storage
        if not self.storage.object_exists(media_file.storage_key):
            raise ValueError("Object not found in storage")

        # Update status
        media_file.status = MediaStatus.UPLOADED.value
        media_file.save()

        # Mark session as completed
        upload_session.completed = True
        upload_session.save()

        # Publish Kafka event
        self.kafka.publish_upload_completed(
            media_id=media_file.id,
            storage_key=media_file.storage_key,
            owner_id=media_file.owner_id,
        )

        return MediaStatus.UPLOADED

    def get_media_file(self, media_id: UUID, owner_id: UUID) -> MediaFileORM:
        """Get a media file by ID, verifying ownership."""
        try:
            media_file = MediaFileORM.objects.get(id=media_id)
            if media_file.owner_id != owner_id:
                raise ValueError("Unauthorized: You do not own this media")
            return media_file
        except MediaFileORM.DoesNotExist:
            raise ValueError("Media file not found")

    def delete_media_file(self, media_id: UUID, owner_id: UUID) -> None:
        """Delete a media file, verifying ownership."""
        media_file = self.get_media_file(media_id, owner_id)

        # Delete from storage
        self.storage.delete_object(media_file.storage_key)

        # Update status
        media_file.status = MediaStatus.DELETED.value
        media_file.save()
