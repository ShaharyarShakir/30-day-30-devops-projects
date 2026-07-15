from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from uuid import UUID


class VideoStatus(str, Enum):
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"


@dataclass
class VideoMetadata:
    id: UUID
    media_id: UUID
    duration: int
    master_playlist_key: str
    thumbnail_key: str | None = None
    preview_sprite_key: str | None = None
    status: VideoStatus = VideoStatus.PROCESSING
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class WatchProgress:
    id: UUID
    user_id: UUID
    lesson_id: UUID
    media_id: UUID
    position: int
    duration: int
    completed: bool = False
    last_played_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class Caption:
    id: UUID
    media_id: UUID
    language: str
    label: str
    format: str
    storage_key: str
    created_at: datetime | None = None


@dataclass
class PlaybackResponse:
    media_id: UUID
    status: VideoStatus
    duration: int
    playlist_url: str
    thumbnail_url: str | None = None
    captions: list[Caption] | None = None


@dataclass
class ProgressUpdateRequest:
    lesson_id: UUID
    position: int
    duration: int
