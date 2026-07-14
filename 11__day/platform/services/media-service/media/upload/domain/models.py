from django.db import models


class MediaFileORM(models.Model):
    id = models.UUIDField(primary_key=True)
    owner_id = models.UUIDField(db_index=True)
    filename = models.TextField()
    mime_type = models.TextField()
    size = models.BigIntegerField()
    storage_key = models.TextField(unique=True)
    status = models.TextField()
    checksum = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "media_files"
        indexes = [
            models.Index(fields=["owner_id"]),
            models.Index(fields=["status"]),
        ]


class UploadSessionORM(models.Model):
    id = models.UUIDField(primary_key=True)
    media_id = models.UUIDField()
    upload_id = models.TextField(null=True, blank=True)
    expires_at = models.DateTimeField()
    completed = models.BooleanField(default=False)
    part_size = models.BigIntegerField(null=True, blank=True)
    total_parts = models.IntegerField(null=True, blank=True)
    uploaded_parts = models.IntegerField(default=0)

    class Meta:
        db_table = "upload_sessions"
        indexes = [
            models.Index(fields=["media_id"]),
            models.Index(fields=["expires_at"]),
        ]
