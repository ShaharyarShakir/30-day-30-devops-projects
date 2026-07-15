from django.db import models


class WatchProgressORM(models.Model):
    id = models.UUIDField(primary_key=True)
    user_id = models.UUIDField(db_index=True)
    lesson_id = models.UUIDField(db_index=True)
    media_id = models.UUIDField(db_index=True)
    position = models.IntegerField(default=0)  # Current position in seconds
    duration = models.IntegerField(default=0)  # Total duration in seconds
    completed = models.BooleanField(default=False)
    last_played_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "watch_progress"
        unique_together = [["user_id", "lesson_id"]]
        indexes = [
            models.Index(fields=["user_id", "lesson_id"]),
            models.Index(fields=["media_id"]),
            models.Index(fields=["completed"]),
        ]


class VideoMetadataORM(models.Model):
    id = models.UUIDField(primary_key=True)
    media_id = models.UUIDField(unique=True, db_index=True)
    duration = models.IntegerField(default=0)  # Duration in seconds
    master_playlist_key = models.TextField()
    thumbnail_key = models.TextField(null=True, blank=True)
    preview_sprite_key = models.TextField(null=True, blank=True)
    status = models.TextField(default="PROCESSING")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "video_metadata"
        indexes = [
            models.Index(fields=["media_id"]),
            models.Index(fields=["status"]),
        ]


class CaptionORM(models.Model):
    id = models.UUIDField(primary_key=True)
    media_id = models.UUIDField(db_index=True)
    language = models.TextField(max_length=10)  # e.g., 'en', 'ur', 'ar', 'es'
    label = models.TextField(max_length=100)  # e.g., 'English', 'Urdu'
    format = models.TextField(max_length=10)  # 'vtt' or 'srt'
    storage_key = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "captions"
        unique_together = [["media_id", "language"]]
        indexes = [
            models.Index(fields=["media_id"]),
            models.Index(fields=["language"]),
        ]
