import base64
import hashlib
import hmac
from datetime import datetime, timedelta
from urllib.parse import urlencode, urlparse, parse_qs

from media.config.settings import settings


class SignedURLGenerator:
    """Generate short-lived signed URLs for HLS playlists."""

    def __init__(self):
        self.secret_key = settings.SECRET_KEY.encode()
        self.default_ttl = timedelta(minutes=5)

    def generate_signed_url(
        self,
        base_url: str,
        storage_key: str,
        expires_in: timedelta | None = None,
    ) -> str:
        """Generate a signed URL for accessing HLS content."""
        if expires_in is None:
            expires_in = self.default_ttl

        expires_at = datetime.utcnow() + expires_in
        expires_timestamp = int(expires_at.timestamp())

        # Parse the base URL
        parsed_url = urlparse(base_url)
        path = parsed_url.path
        if storage_key and not path.endswith(storage_key):
            path = f"{path.rstrip('/')}/{storage_key}"

        # Create signature payload
        payload = f"{path}:{expires_timestamp}"
        signature = hmac.new(
            self.secret_key,
            payload.encode(),
            hashlib.sha256,
        ).digest()
        signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")

        # Build query parameters
        params = {
            "expires": expires_timestamp,
            "signature": signature_b64,
        }

        # Construct signed URL
        signed_url = f"{parsed_url.scheme}://{parsed_url.netloc}{path}?{urlencode(params)}"
        return signed_url

    def verify_signed_url(self, signed_url: str) -> bool:
        """Verify a signed URL's signature."""
        try:
            parsed_url = urlparse(signed_url)
            params = dict(
                (k, v[0] if isinstance(v, list) else v)
                for k, v in parse_qs(parsed_url.query).items()
            )

            expires_timestamp = int(params["expires"])
            signature = params["signature"]

            # Check expiration
            if datetime.utcnow().timestamp() > expires_timestamp:
                return False

            # Reconstruct payload and verify signature
            path = parsed_url.path
            payload = f"{path}:{expires_timestamp}"
            expected_signature = hmac.new(
                self.secret_key,
                payload.encode(),
                hashlib.sha256,
            ).digest()
            expected_signature_b64 = (
                base64.urlsafe_b64encode(expected_signature).decode().rstrip("=")
            )

            return hmac.compare_digest(signature, expected_signature_b64)
        except (KeyError, ValueError):
            return False


class CDNURLBuilder:
    """Build CDN URLs for media content."""

    def __init__(self):
        self.cdn_base_url = getattr(settings, "CDN_BASE_URL", settings.S3_ENDPOINT_URL)
        self.s3_bucket = settings.S3_BUCKET

    def build_playlist_url(self, storage_key: str) -> str:
        """Build the base URL for an HLS playlist."""
        return f"{self.cdn_base_url}/{self.s3_bucket}/{storage_key}"

    def build_thumbnail_url(self, storage_key: str) -> str:
        """Build the URL for a thumbnail image."""
        return f"{self.cdn_base_url}/{self.s3_bucket}/{storage_key}"

    def build_caption_url(self, storage_key: str) -> str:
        """Build the URL for a caption file."""
        return f"{self.cdn_base_url}/{self.s3_bucket}/{storage_key}"
