import re
import hashlib
import numpy as np

# Keywords list for skill extraction
SKILL_KEYWORDS = [
    "python", "go", "golang", "java", "c++", "rust", "javascript", "typescript", "ruby", "php",
    "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "terraform", "ansible", "ci/cd", "jenkins",
    "git", "postgresql", "postgres", "mysql", "redis", "mongodb", "sqlite", "vector database",
    "fastapi", "flask", "django", "react", "vue", "angular", "node.js", "next.js",
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch", "scikit-learn",
    "pandas", "numpy", "statistics", "data engineering", "spark", "hadoop", "kafka", "rabbitmq"
]

def extract_features(text: str) -> dict:
    """
    Extracts features (skills, experience, education) from raw text.
    """
    clean_text = text.lower()
    
    # 1. Extract Skills
    skills = []
    for skill in SKILL_KEYWORDS:
        # Use word boundaries to avoid partial matches (e.g. "go" matching inside "good")
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, clean_text):
            skills.append(skill)
            
    # 2. Extract Experience
    # Look for year mentions or phrases like "X years of experience"
    experience_matches = re.findall(
        r'(\b\d{1,2}\+?\s*(?:years?|yrs?)\b\s*(?:of\s*)?(?:experience|work|industry)?)', 
        clean_text
    )
    # Also find titles to augment context
    experience_titles = re.findall(
        r'\b(software engineer|developer|data scientist|ml engineer|project manager|devops engineer|intern)\b',
        clean_text
    )
    
    experience = {
        "mentions": experience_matches[:5],
        "roles": list(set(experience_titles[:5])),
        "summary": f"Detected experience details: {', '.join(experience_matches[:3])}" if experience_matches else "No clear experience duration found."
    }
    
    # 3. Extract Education
    education_matches = []
    edu_patterns = [
        r'\b(bachelor|b\.s\.|bs|master|m\.s\.|ms|phd|p\.h\.d\.)\b',
        r'\b(university|college|institute|polytechnic)\b'
    ]
    for pattern in edu_patterns:
        matches = re.findall(pattern, clean_text)
        if matches:
            education_matches.extend(matches)
            
    education = {
        "degrees_and_institutes": list(set(education_matches[:6])),
        "summary": f"Detected education context: {', '.join(list(set(education_matches[:3])))}" if education_matches else "No clear education context found."
    }
    
    return {
        "skills": skills,
        "experience": experience,
        "education": education
    }

def generate_embedding(text: str) -> list:
    """
    Generates a deterministic 768-dimensional normalized embedding vector.
    Utilizes a Random Projection trick seeded by word hash to emulate bag-of-words similarity.
    """
    embedding_dim = 768
    embedding = np.zeros(embedding_dim, dtype=np.float32)
    
    # Tokenize text into words (alphanumeric and underscores)
    words = re.findall(r'\b\w+\b', text.lower())
    if not words:
        return [0.0] * embedding_dim
        
    for word in words:
        # Generate a deterministic hash of the word to seed the random state
        word_hash = hashlib.sha256(word.encode("utf-8")).hexdigest()
        # Use first 8 characters (32 bits) as seed
        seed = int(word_hash[:8], 16)
        
        # Instantiate a local random generator with this seed
        rng = np.random.default_rng(seed)
        # Generate a pseudo-random normal distribution vector
        word_vector = rng.normal(0.0, 1.0, embedding_dim)
        
        embedding += word_vector
        
    # L2 normalize the final vector
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
        
    return embedding.tolist()
