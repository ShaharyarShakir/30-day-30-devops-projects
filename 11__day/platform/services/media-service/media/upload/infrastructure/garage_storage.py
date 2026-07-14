import boto3
from botocore.client import Config
from datetime import timedelta

from media.config.settings import settings
from media.upload.infrastructure.storage import ObjectStorage


class GarageObjectStorage(ObjectStorage):
    """Garage S3-compatible storage implementation."""

    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.S3_BUCKET

    def create_upload_url(
        self, storage_key: str, content_type: str, expires_in: timedelta
    ) -> str:
        """Generate a pre-signed URL for uploading an object."""
        return self.s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket,
                "Key": storage_key,
                "ContentType": content_type,
            },
            ExpiresIn=int(expires_in.total_seconds()),
        )

    def create_download_url(
        self, storage_key: str, expires_in: timedelta
    ) -> str:
        """Generate a pre-signed URL for downloading an object."""
        return self.s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket,
                "Key": storage_key,
            },
            ExpiresIn=int(expires_in.total_seconds()),
        )

    def object_exists(self, storage_key: str) -> bool:
        """Check if an object exists in storage."""
        try:
            self.s3_client.head_object(Bucket=self.bucket, Key=storage_key)
            return True
        except self.s3_client.exceptions.ClientError:
            return False

    def delete_object(self, storage_key: str) -> None:
        """Delete an object from storage."""
        self.s3_client.delete_object(Bucket=self.bucket, Key=storage_key)

    def create_multipart_upload(
        self, storage_key: str, content_type: str
    ) -> str:
        """Initialize a multipart upload and return the upload ID."""
        response = self.s3_client.create_multipart_upload(
            Bucket=self.bucket,
            Key=storage_key,
            ContentType=content_type,
        )
        return response["UploadId"]

    def generate_upload_part_url(
        self,
        storage_key: str,
        upload_id: str,
        part_number: int,
        expires_in: timedelta,
    ) -> str:
        """Generate a pre-signed URL for uploading a specific part."""
        return self.s3_client.generate_presigned_url(
            "upload_part",
            Params={
                "Bucket": self.bucket,
                "Key": storage_key,
                "UploadId": upload_id,
                "PartNumber": part_number,
            },
            ExpiresIn=int(expires_in.total_seconds()),
        )

    def complete_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
        parts: list[dict],
    ) -> dict:
        """Complete a multipart upload with the given parts."""
        response = self.s3_client.complete_multipart_upload(
            Bucket=self.bucket,
            Key=storage_key,
            UploadId=upload_id,
            MultipartUpload={"Parts": parts},
        )
        return {
            "location": response.get("Location"),
            "bucket": response.get("Bucket"),
            "key": response.get("Key"),
            "etag": response.get("ETag"),
        }

    def abort_multipart_upload(
        self, storage_key: str, upload_id: str
    ) -> None:
        """Abort a multipart upload and clean up parts."""
        self.s3_client.abort_multipart_upload(
            Bucket=self.bucket,
            Key=storage_key,
            UploadId=upload_id,
        )

    def get_object_metadata(self, storage_key: str) -> dict:
        """Get object metadata including size and checksum."""
        response = self.s3_client.head_object(Bucket=self.bucket, Key=storage_key)
        return {
            "size": response.get("ContentLength"),
            "etag": response.get("ETag").strip('"'),
            "content_type": response.get("ContentType"),
        }
