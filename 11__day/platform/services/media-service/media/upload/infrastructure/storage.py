from abc import ABC, abstractmethod
from datetime import timedelta
from typing import Optional


class ObjectStorage(ABC):
    """Abstract interface for object storage operations."""

    @abstractmethod
    def create_upload_url(
        self, storage_key: str, content_type: str, expires_in: timedelta
    ) -> str:
        """Generate a pre-signed URL for uploading an object."""
        pass

    @abstractmethod
    def create_download_url(
        self, storage_key: str, expires_in: timedelta
    ) -> str:
        """Generate a pre-signed URL for downloading an object."""
        pass

    @abstractmethod
    def object_exists(self, storage_key: str) -> bool:
        """Check if an object exists in storage."""
        pass

    @abstractmethod
    def delete_object(self, storage_key: str) -> None:
        """Delete an object from storage."""
        pass

    @abstractmethod
    def create_multipart_upload(
        self, storage_key: str, content_type: str
    ) -> str:
        """Initialize a multipart upload and return the upload ID."""
        pass

    @abstractmethod
    def generate_upload_part_url(
        self,
        storage_key: str,
        upload_id: str,
        part_number: int,
        expires_in: timedelta,
    ) -> str:
        """Generate a pre-signed URL for uploading a specific part."""
        pass

    @abstractmethod
    def complete_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
        parts: list[dict],
    ) -> dict:
        """Complete a multipart upload with the given parts."""
        pass

    @abstractmethod
    def abort_multipart_upload(
        self, storage_key: str, upload_id: str
    ) -> None:
        """Abort a multipart upload and clean up parts."""
        pass

    @abstractmethod
    def get_object_metadata(self, storage_key: str) -> dict:
        """Get object metadata including size and checksum."""
        pass
