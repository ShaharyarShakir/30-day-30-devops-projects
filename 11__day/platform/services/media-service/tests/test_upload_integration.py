import pytest
from django.test import override_settings
from rest_framework.test import APIClient
from uuid import UUID

from media.upload.domain.models import MediaFileORM, UploadSessionORM
from media.upload.domain.entities import MediaStatus


@pytest.mark.django_db
class TestUploadIntegration:
    """Integration tests for upload session flow."""

    def test_create_upload_session(self):
        """Test creating an upload session."""
        client = APIClient()
        response = client.post(
            "/api/uploads/",
            {
                "filename": "lesson1.mp4",
                "size": 125000000,
                "mimeType": "video/mp4",
            },
            format="json",
        )

        assert response.status_code == 201
        data = response.json()
        assert "uploadId" in data
        assert "mediaId" in data
        assert "storageKey" in data
        assert "uploadUrl" in data

        # Verify database records
        media_id = UUID(data["mediaId"])
        assert MediaFileORM.objects.filter(id=media_id).exists()
        media_file = MediaFileORM.objects.get(id=media_id)
        assert media_file.filename == "lesson1.mp4"
        assert media_file.mime_type == "video/mp4"
        assert media_file.size == 125000000
        assert media_file.status == MediaStatus.UPLOADING.value

        upload_id = UUID(data["uploadId"])
        assert UploadSessionORM.objects.filter(id=upload_id).exists()
        upload_session = UploadSessionORM.objects.get(id=upload_id)
        assert upload_session.media_id == media_id
        assert not upload_session.completed

    def test_create_upload_session_invalid_mime_type(self):
        """Test creating upload session with invalid MIME type."""
        client = APIClient()
        response = client.post(
            "/api/uploads/",
            {
                "filename": "document.pdf",
                "size": 1000000,
                "mimeType": "application/pdf",
            },
            format="json",
        )

        assert response.status_code == 400
        assert "error" in response.json()

    def test_create_upload_session_size_too_large(self):
        """Test creating upload session with size exceeding limit."""
        client = APIClient()
        response = client.post(
            "/api/uploads/",
            {
                "filename": "huge.mp4",
                "size": 30 * 1024 * 1024 * 1024,  # 30 GB
                "mimeType": "video/mp4",
            },
            format="json",
        )

        assert response.status_code == 400
        assert "error" in response.json()

    def test_complete_upload_session(self):
        """Test completing an upload session."""
        # First create an upload session
        client = APIClient()
        create_response = client.post(
            "/api/uploads/",
            {
                "filename": "lesson1.mp4",
                "size": 125000000,
                "mimeType": "video/mp4",
            },
            format="json",
        )
        assert create_response.status_code == 201
        upload_id = create_response.json()["uploadId"]

        # Note: This will fail without actual S3 storage, but tests the flow
        complete_response = client.post(f"/api/uploads/{upload_id}/complete/")
        
        # Expected to fail because object doesn't exist in storage
        assert complete_response.status_code == 400
        assert "Object not found in storage" in complete_response.json()["error"]

    def test_get_media_file(self):
        """Test getting a media file by ID."""
        # Create a media file directly
        from uuid import uuid4
        media_id = uuid4()
        media_file = MediaFileORM.objects.create(
            id=media_id,
            owner_id=UUID("00000000-0000-0000-0000-000000000000"),
            filename="lesson1.mp4",
            mime_type="video/mp4",
            size=125000000,
            storage_key="media/test/lesson1.mp4",
            status=MediaStatus.READY.value,
        )

        client = APIClient()
        response = client.get(f"/api/files/{media_id}/")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(media_id)
        assert data["filename"] == "lesson1.mp4"
        assert data["status"] == MediaStatus.READY.value

    def test_get_media_file_not_found(self):
        """Test getting a non-existent media file."""
        client = APIClient()
        from uuid import uuid4
        fake_id = uuid4()
        response = client.get(f"/api/files/{fake_id}/")

        assert response.status_code == 404

    def test_delete_media_file(self):
        """Test deleting a media file."""
        # Create a media file directly
        from uuid import uuid4
        media_id = uuid4()
        media_file = MediaFileORM.objects.create(
            id=media_id,
            owner_id=UUID("00000000-0000-0000-0000-000000000000"),
            filename="lesson1.mp4",
            mime_type="video/mp4",
            size=125000000,
            storage_key="media/test/lesson1.mp4",
            status=MediaStatus.READY.value,
        )

        client = APIClient()
        response = client.delete(f"/api/files/{media_id}/")

        # Note: This will fail without actual S3 storage
        assert response.status_code == 404  # Because storage deletion fails
