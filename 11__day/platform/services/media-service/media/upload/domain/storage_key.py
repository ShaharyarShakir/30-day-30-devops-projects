import secrets
from uuid import UUID


def generate_storage_key(filename: str) -> str:
    """Generate an immutable storage key with even distribution.
    
    Format: media/{first2}/{second2}/{uuid}/{filename}
    Example: media/7c/34/734a6.../original.mp4
    
    Advantages:
    - Even distribution across partitions
    - No filename collisions
    - Easy CDN integration
    """
    object_id = secrets.token_hex(16)
    first_two = object_id[:2]
    second_two = object_id[2:4]
    return f"media/{first_two}/{second_two}/{object_id}/{filename}"
