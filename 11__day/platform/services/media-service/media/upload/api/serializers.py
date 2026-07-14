from datetime import datetime, timedelta
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator
from pydantic.types import UUID4

from media.config.settings import settings
from media.upload.domain.entities import MediaStatus
from media.upload.domain.mime_validation import validate_mime_type
from media.upload.domain.storage_key import generate_storage_key


class CreateUploadRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    size: int = Field(..., gt=0, le=settings.MAX_UPLOAD_SIZE)
    mimeType: str = Field(..., alias="mimeType")

    @field_validator("mimeType")
    @classmethod
    def validate_mime_type_field(cls, v):
        if not validate_mime_type(v):
            raise ValueError(f"Invalid MIME type: {v}")
        return v


class CreateUploadResponse(BaseModel):
    uploadId: str = Field(..., alias="uploadId")
    mediaId: UUID4 = Field(..., alias="mediaId")
    storageKey: str = Field(..., alias="storageKey")
    uploadUrl: str = Field(..., alias="uploadUrl")


class CompleteUploadResponse(BaseModel):
    status: MediaStatus


class MediaFileResponse(BaseModel):
    id: UUID4
    ownerId: UUID4 = Field(..., alias="ownerId")
    filename: str
    mimeType: str = Field(..., alias="mimeType")
    size: int
    storageKey: str = Field(..., alias="storageKey")
    status: MediaStatus
    checksum: str | None = None
    createdAt: datetime = Field(..., alias="createdAt")
    updatedAt: datetime = Field(..., alias="updatedAt")
