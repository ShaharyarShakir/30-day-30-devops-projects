import pytest

from media.upload.domain.mime_validation import (
    ALLOWED_MIME_TYPES,
    validate_file_signature,
    validate_mime_type,
)


def test_validate_mime_type_allowed():
    """Test that allowed MIME types pass validation."""
    for mime_type in ALLOWED_MIME_TYPES:
        assert validate_mime_type(mime_type), f"{mime_type} should be allowed"


def test_validate_mime_type_rejected():
    """Test that disallowed MIME types fail validation."""
    assert not validate_mime_type("application/pdf"), "application/pdf should be rejected"
    assert not validate_mime_type("image/jpeg"), "image/jpeg should be rejected"
    assert not validate_mime_type("video/avi"), "video/avi should be rejected"


def test_validate_file_signature_mp4():
    """Test MP4 file signature validation."""
    # Valid MP4 signature (ftypmp42) - pattern starts at offset 4
    mp4_data = b"\x00\x00\x00\x00" + b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 100
    assert validate_file_signature(mp4_data, "video/mp4"), "Valid MP4 signature should pass"

    # Valid MP4 signature (ftypisom)
    mp4_isom_data = b"\x00\x00\x00\x00" + b"\x00\x00\x00\x20ftypisom" + b"\x00" * 100
    assert validate_file_signature(mp4_isom_data, "video/mp4"), "Valid MP4 isom signature should pass"

    # Invalid data
    invalid_data = b"\x00\x00\x00\x00" * 100
    assert not validate_file_signature(invalid_data, "video/mp4"), "Invalid signature should fail"


def test_validate_file_signature_webm():
    """Test WebM file signature validation."""
    # Valid WebM signature (EBML header)
    webm_data = b"\x1a\x45\xdf\xa3" + b"\x00" * 100
    assert validate_file_signature(webm_data, "video/webm"), "Valid WebM signature should pass"

    # Invalid data
    invalid_data = b"\x00\x00\x00\x00" * 100
    assert not validate_file_signature(invalid_data, "video/webm"), "Invalid signature should fail"


def test_validate_file_signature_quicktime():
    """Test QuickTime file signature validation."""
    # Valid QuickTime signature - pattern starts at offset 4
    qt_data = b"\x00\x00\x00\x00" + b"\x00\x00\x00\x14ftypqt  " + b"\x00" * 100
    assert validate_file_signature(qt_data, "video/quicktime"), "Valid QuickTime signature should pass"

    # Invalid data
    invalid_data = b"\x00\x00\x00\x00" * 100
    assert not validate_file_signature(invalid_data, "video/quicktime"), "Invalid signature should fail"


def test_validate_file_signature_unsupported_mime():
    """Test that unsupported MIME types fail signature validation."""
    data = b"\x00\x00\x00\x00" * 100
    assert not validate_file_signature(data, "application/pdf"), "Unsupported MIME should fail"
