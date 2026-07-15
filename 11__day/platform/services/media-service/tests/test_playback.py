import json
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from media.video.domain.models import VideoMetadataORM, WatchProgressORM, CaptionORM
from media.video.infrastructure.storage import SignedURLGenerator, CDNURLBuilder


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mock_user_headers():
    return {
        "HTTP_X_USER_ID": str(uuid4()),
        "HTTP_X_USER_EMAIL": "student@test.com",
        "HTTP_X_USER_ROLES": "student"
    }


@pytest.fixture
def mock_instructor_headers():
    return {
        "HTTP_X_USER_ID": str(uuid4()),
        "HTTP_X_USER_EMAIL": "instructor@test.com",
        "HTTP_X_USER_ROLES": "instructor"
    }


@pytest.mark.django_db
def test_signed_url_generator():
    generator = SignedURLGenerator()
    base_url = "http://localhost:4000/media/media/123-abc/master.m3u8"
    storage_key = "master.m3u8"
    
    # Generate signed URL
    signed_url = generator.generate_signed_url(base_url, storage_key, expires_in=timedelta(minutes=5))
    assert "expires=" in signed_url
    assert "signature=" in signed_url

    # Verify signature
    assert generator.verify_signed_url(signed_url) is True

    # Verification fails on expired signed URL
    expired_signed_url = generator.generate_signed_url(base_url, storage_key, expires_in=timedelta(seconds=-10))
    assert generator.verify_signed_url(expired_signed_url) is False

    # Verification fails on tempered signature
    tampered_url = signed_url.replace("signature=", "signature=tampered")
    assert generator.verify_signed_url(tampered_url) is False


@pytest.mark.django_db
@patch("media.video.application.services.VideoPlaybackService._check_enrollment")
@patch("media.video.application.services.KafkaAnalyticsProducer.publish_event")
def test_playback_metadata_api(mock_publish, mock_check_enrollment, api_client, mock_user_headers):
    mock_check_enrollment.return_value = True
    media_id = uuid4()
    lesson_id = uuid4()

    # Create mock video metadata
    VideoMetadataORM.objects.create(
        id=uuid4(),
        media_id=media_id,
        duration=1200,
        master_playlist_key=f"media/{media_id}/master.m3u8",
        status="READY"
    )

    url = reverse("video-play", kwargs={"video_id": str(media_id)})
    
    # Missing gateway auth headers should fail
    response = api_client.get(url)
    assert response.status_code == 403

    # Add auth headers
    api_client.credentials(**mock_user_headers)

    response = api_client.get(f"{url}?lessonId={lesson_id}")
    assert response.status_code == 200
    
    data = response.json()
    assert data["mediaId"] == str(media_id)
    assert data["status"] == "READY"
    assert data["duration"] == 1200
    assert "master.m3u8" in data["playlistUrl"]
    assert "signature=" in data["playlistUrl"]

    assert mock_check_enrollment.call_count >= 1
    mock_publish.assert_called()


@pytest.mark.django_db
@patch("media.video.application.services.VideoPlaybackService._check_enrollment")
def test_playback_restricted_enrollment(mock_check_enrollment, api_client, mock_user_headers):
    # Enforce check enrollment to fail
    mock_check_enrollment.return_value = False
    media_id = uuid4()

    # Create mock video metadata
    VideoMetadataORM.objects.create(
        id=uuid4(),
        media_id=media_id,
        duration=1200,
        master_playlist_key=f"media/{media_id}/master.m3u8",
        status="READY"
    )

    url = reverse("video-play", kwargs={"video_id": str(media_id)})
    
    # Configure auth headers
    api_client.credentials(**mock_user_headers)

    response = api_client.get(f"{url}?lessonId={uuid4()}")
    assert response.status_code == 403
    assert "enroll" in response.json()["error"].lower()


@pytest.mark.django_db
@patch("media.video.application.services.VideoPlaybackService._check_enrollment")
def test_playback_instructor_bypass(mock_check_enrollment, api_client, mock_instructor_headers):
    # Enforce check enrollment to return false, but user is instructor
    mock_check_enrollment.return_value = False
    media_id = uuid4()

    # Create mock video metadata
    VideoMetadataORM.objects.create(
        id=uuid4(),
        media_id=media_id,
        duration=1200,
        master_playlist_key=f"media/{media_id}/master.m3u8",
        status="READY"
    )

    url = reverse("video-play", kwargs={"video_id": str(media_id)})
    
    # Configure auth headers for instructor
    api_client.credentials(**mock_instructor_headers)

    response = api_client.get(f"{url}?lessonId={uuid4()}")
    assert response.status_code == 200  # Bypass should succeed
    
    # Check enrollment should not be called since bypass occurred
    mock_check_enrollment.assert_not_called()


@pytest.mark.django_db
@patch("media.video.api.views.GarageObjectStorage")
def test_file_serve_signature_and_redirect(mock_storage_class, api_client):
    mock_storage = MagicMock()
    mock_storage.object_exists.return_value = True
    mock_storage.create_download_url.return_value = "http://garage-s3-temp/download"
    mock_storage_class.return_value = mock_storage

    generator = SignedURLGenerator()
    storage_key = "media/123-abc/master.m3u8"
    
    base_url = f"http://localhost:4000/media/media/{storage_key}"
    signed_url = generator.generate_signed_url(base_url, "")
    
    # Test getting without valid signature
    url = reverse("serve-media-file", kwargs={"storage_key": storage_key})
    response = api_client.get(url)
    assert response.status_code == 403

    # Test getting with valid signature
    # Reconstruct route request with signature query parameters
    query_str = signed_url.split("?")[1]
    response = api_client.get(f"{url}?{query_str}")
    
    assert response.status_code == 302
    assert response.url == "http://garage-s3-temp/download"


@pytest.mark.django_db
@patch("media.video.application.services.KafkaAnalyticsProducer.publish_event")
@patch("media.video.application.services.WatchProgressService._get_media_id_for_lesson")
def test_watch_progress_and_completion(mock_get_media, mock_publish, api_client, mock_user_headers):
    lesson_id = uuid4()
    mock_get_media.return_value = lesson_id
    
    # Configure auth headers
    api_client.credentials(**mock_user_headers)

    # Test saving watch progress
    url = reverse("progress-update")
    payload = {
        "lessonId": str(lesson_id),
        "position": 50,
        "duration": 100
    }
    response = api_client.post(url, data=payload, format="json")
    assert response.status_code == 200
    data = response.json()
    assert data["position"] == 50
    assert data["completed"] is False

    # Verify database entry
    db_progress = WatchProgressORM.objects.get(user_id=mock_user_headers["HTTP_X_USER_ID"], lesson_id=lesson_id)
    assert db_progress.position == 50
    assert db_progress.completed is False

    # Test saving watch progress >= 90%
    payload_completed = {
        "lessonId": str(lesson_id),
        "position": 92,
        "duration": 100
    }
    response_completed = api_client.post(url, data=payload_completed, format="json")
    assert response_completed.status_code == 200
    data_completed = response_completed.json()
    assert data_completed["position"] == 92
    assert data_completed["completed"] is True

    # Verify db marked complete
    db_progress.refresh_from_db()
    assert db_progress.completed is True

    # Test getting progress coordinates
    detail_url = reverse("progress-detail", kwargs={"lesson_id": str(lesson_id)})
    response_detail = api_client.get(detail_url)
    assert response_detail.status_code == 200
    data_detail = response_detail.json()
    assert data_detail["position"] == 92
    assert data_detail["completed"] is True
