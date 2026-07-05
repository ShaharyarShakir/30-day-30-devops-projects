import re
import hashlib
import numpy as np

def generate_embedding(text: str) -> list:
    """
    Generates a deterministic 768-dimensional normalized embedding vector.
    Matches the algorithm used in ML Service.
    """
    embedding_dim = 768
    embedding = np.zeros(embedding_dim, dtype=np.float32)
    
    # Tokenize text
    words = re.findall(r'\b\w+\b', text.lower())
    if not words:
        return [0.0] * embedding_dim
        
    for word in words:
        word_hash = hashlib.sha256(word.encode("utf-8")).hexdigest()
        seed = int(word_hash[:8], 16)
        
        # Deterministic RNG
        rng = np.random.default_rng(seed)
        word_vector = rng.normal(0.0, 1.0, embedding_dim)
        
        embedding += word_vector
        
    # L2 normalize
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
        
    return embedding.tolist()
