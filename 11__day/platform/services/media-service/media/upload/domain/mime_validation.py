from dataclasses import dataclass


@dataclass
class MagicBytes:
    pattern: bytes
    offset: int


ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
}

MAGIC_BYTES_MAP = {
    "video/mp4": [
        MagicBytes(pattern=b"\x00\x00\x00\x18ftypmp42", offset=4),
        MagicBytes(pattern=b"\x00\x00\x00\x20ftypisom", offset=4),
    ],
    "video/webm": [
        MagicBytes(pattern=b"\x1a\x45\xdf\xa3", offset=0),
    ],
    "video/quicktime": [
        MagicBytes(pattern=b"\x00\x00\x00\x14ftypqt  ", offset=4),
    ],
}


def validate_mime_type(mime_type: str) -> bool:
    """Validate that the MIME type is allowed."""
    return mime_type in ALLOWED_MIME_TYPES


def validate_file_signature(data: bytes, declared_mime_type: str) -> bool:
    """Validate file signature (magic bytes) matches declared MIME type."""
    if declared_mime_type not in MAGIC_BYTES_MAP:
        return False
    
    patterns = MAGIC_BYTES_MAP[declared_mime_type]
    for magic_bytes in patterns:
        if len(data) > magic_bytes.offset + len(magic_bytes.pattern):
            actual = data[magic_bytes.offset : magic_bytes.offset + len(magic_bytes.pattern)]
            if actual == magic_bytes.pattern:
                return True
    
    return False
