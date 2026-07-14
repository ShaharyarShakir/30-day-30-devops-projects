from uuid import UUID

from django.http import HttpRequest
from pydantic import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from media.upload.api.serializers import (
    CompleteUploadResponse,
    CreateUploadRequest,
    CreateUploadResponse,
    MediaFileResponse,
)
from media.upload.application.services import UploadService
from media.upload.domain.entities import MediaStatus


@api_view(["POST"])
@permission_classes([AllowAny])
def create_upload(request: HttpRequest) -> Response:
    """Create a new upload session."""
    try:
        data = CreateUploadRequest(**request.data)
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    # TODO: Extract owner_id from JWT
    owner_id = UUID("00000000-0000-0000-0000-000000000000")

    service = UploadService()
    session, upload_url = service.create_upload_session(
        owner_id=owner_id,
        filename=data.filename,
        mime_type=data.mimeType,
        size=data.size,
    )

    response = CreateUploadResponse(
        uploadId=str(session.id),
        mediaId=session.media_id,
        storageKey=upload_url.split("/")[-1],
        uploadUrl=upload_url,
    )

    return Response(response.model_dump(by_alias=True), status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def complete_upload(request: HttpRequest, upload_id: str) -> Response:
    """Complete an upload session."""
    # TODO: Extract owner_id from JWT
    owner_id = UUID("00000000-0000-0000-0000-000000000000")

    try:
        session_id = UUID(upload_id)
    except ValueError:
        return Response({"error": "Invalid upload ID"}, status=400)

    service = UploadService()
    try:
        status = service.complete_upload(session_id=session_id, owner_id=owner_id)
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    response = CompleteUploadResponse(status=status)
    return Response(response.model_dump(by_alias=True))


class MediaFileDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: HttpRequest, media_id: str) -> Response:
        """Get a media file by ID."""
        # TODO: Extract owner_id from JWT
        owner_id = UUID("00000000-0000-0000-0000-000000000000")

        try:
            media_id_uuid = UUID(media_id)
        except ValueError:
            return Response({"error": "Invalid media ID"}, status=400)

        service = UploadService()
        try:
            media_file = service.get_media_file(media_id=media_id_uuid, owner_id=owner_id)
        except ValueError as e:
            return Response({"error": str(e)}, status=404)

        response = MediaFileResponse(
            id=media_file.id,
            ownerId=media_file.owner_id,
            filename=media_file.filename,
            mimeType=media_file.mime_type,
            size=media_file.size,
            storageKey=media_file.storage_key,
            status=MediaStatus(media_file.status),
            checksum=media_file.checksum,
            createdAt=media_file.created_at,
            updatedAt=media_file.updated_at,
        )

        return Response(response.model_dump(by_alias=True))

    def delete(self, request: HttpRequest, media_id: str) -> Response:
        """Delete a media file."""
        # TODO: Extract owner_id from JWT
        owner_id = UUID("00000000-0000-0000-0000-000000000000")

        try:
            media_id_uuid = UUID(media_id)
        except ValueError:
            return Response({"error": "Invalid media ID"}, status=400)

        service = UploadService()
        try:
            service.delete_media_file(media_id=media_id_uuid, owner_id=owner_id)
        except ValueError as e:
            return Response({"error": str(e)}, status=404)

        return Response(status=204)
