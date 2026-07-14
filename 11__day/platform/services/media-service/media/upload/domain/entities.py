from dataclasses import dataclass
from enum import Enum
from uuid import UUID


class MediaStatus(str, Enum):
    UPLOADING = "UPLOADING"
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"
    DELETED = "DELETED"


@dataclass
class MediaFile:
    id: UUID
    owner_id: UUID
    filename: str
    mime_type: str
    size: int
    storage_key: str
    status: MediaStatus
    checksum: str | None = None


@dataclass
class UploadSession:
    id: UUID
    media_id: UUID
    upload_id: str | None
    expires_at: str
    completed: bool = False
    part_size: int | None = None
    total_parts: int | None = None
    uploaded_parts: int = 0
