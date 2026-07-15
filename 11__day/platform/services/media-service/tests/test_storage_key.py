import re

from media.upload.domain.storage_key import generate_storage_key


def test_storage_key_format():
    """Test that storage keys follow the expected format."""
    filename = "original.mp4"
    storage_key = generate_storage_key(filename)

    # Format: media/{first2}/{second2}/{uuid}/{filename}
    pattern = r"^media/[a-f0-9]{2}/[a-f0-9]{2}/[a-f0-9]{32}/.+$"
    assert re.match(pattern, storage_key), f"Storage key {storage_key} does not match expected format"


def test_storage_key_ends_with_filename():
    """Test that storage keys end with the original filename."""
    filename = "lesson1.mp4"
    storage_key = generate_storage_key(filename)
    assert storage_key.endswith(filename), f"Storage key {storage_key} should end with {filename}"


def test_storage_keys_are_unique():
    """Test that storage keys are unique for each call."""
    filename = "test.mp4"
    keys = [generate_storage_key(filename) for _ in range(100)]
    assert len(set(keys)) == 100, "Storage keys should be unique"


def test_storage_key_distribution():
    """Test that storage keys are distributed across different prefixes."""
    filename = "test.mp4"
    keys = [generate_storage_key(filename) for _ in range(1000)]

    # Extract first two-character prefixes
    prefixes = set(key.split("/")[1] for key in keys)
    assert len(prefixes) > 50, f"Keys should be distributed across many prefixes, got {len(prefixes)}"
