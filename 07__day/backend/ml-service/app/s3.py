import os
import logging
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

GARAGE_ENDPOINT = os.getenv("GARAGE_ENDPOINT", "http://garage:3900")
ACCESS_KEY = os.getenv("GARAGE_ACCESS_KEY_ID", "GK3515373e4c851ebaad366558")
SECRET_KEY = os.getenv("GARAGE_SECRET_ACCESS_KEY", "7d37d093435a41f2aab8f13c19ba067d9776c90215f56614adad6ece597dbb34")
BUCKET_NAME = os.getenv("RESUMES_BUCKET", "resumes")

# Configure S3 client
s3_client = boto3.client(
    "s3",
    endpoint_url=GARAGE_ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1"
)

def download_pdf(object_key: str) -> bytes:
    """
    Downloads a PDF file from S3 and returns its raw bytes.
    """
    try:
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=object_key)
        return response["Body"].read()
    except ClientError as e:
        logger.error(f"Failed to download {object_key} from S3: {e}")
        raise e
