import os
import logging
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Fetch environment variables
GARAGE_ENDPOINT = os.getenv("GARAGE_ENDPOINT", "http://garage:3900")
ACCESS_KEY = os.getenv("GARAGE_ACCESS_KEY_ID", "GK3515373e4c851ebaad366558")
SECRET_KEY = os.getenv("GARAGE_SECRET_ACCESS_KEY", "7d37d093435a41f2aab8f13c19ba067d9776c90215f56614adad6ece597dbb34")
BUCKET_NAME = os.getenv("RESUMES_BUCKET", "resumes")

# Configure S3 client for Garage
# Garage uses path-style addressing and requires signature version s3v4
s3_client = boto3.client(
    "s3",
    endpoint_url=GARAGE_ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1" # Garage expects a region name, can be anything e.g. dc1 or us-east-1
)

def upload_pdf(file_bytes: bytes, filename: str) -> str:
    """
    Uploads PDF bytes to Garage S3 and returns the object key.
    """
    try:
        # Create a unique object key using timestamp and filename
        object_key = f"resumes/{filename}"
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=object_key,
            Body=file_bytes,
            ContentType="application/pdf"
        )
        logger.info(f"Successfully uploaded {filename} to S3 as {object_key}")
        return object_key
    except ClientError as e:
        logger.error(f"Failed to upload {filename} to S3: {e}")
        raise e

def delete_pdf(object_key: str):
    """
    Deletes a PDF object from S3.
    """
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=object_key)
        logger.info(f"Successfully deleted {object_key} from S3")
    except ClientError as e:
        logger.error(f"Failed to delete {object_key} from S3: {e}")
        raise e
