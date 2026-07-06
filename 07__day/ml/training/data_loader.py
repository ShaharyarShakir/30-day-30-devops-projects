import os
import json
import logging
import hashlib
import re
import numpy as np
import pandas as pd
from typing import List, Dict, Any

from ml.training.config import DATASET_PATH, TARGET_DEVOPS_SKILLS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_deterministic_embedding(text: str) -> List[float]:
    """
    Generates a deterministic 768-dimensional normalized embedding vector.
    Replicates the random projection hashing logic used in ml-service.
    """
    embedding_dim = 768
    embedding = np.zeros(embedding_dim, dtype=np.float32)
    
    words = re.findall(r'\b\w+\b', text.lower())
    if not words:
        return [0.0] * embedding_dim
        
    for word in words:
        word_hash = hashlib.sha256(word.encode("utf-8")).hexdigest()
        seed = int(word_hash[:8], 16)
        rng = np.random.default_rng(seed)
        word_vector = rng.normal(0.0, 1.0, embedding_dim)
        embedding += word_vector
        
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
        
    return embedding.tolist()

def create_synthetic_resumes(count: int = 250) -> List[Dict[str, Any]]:
    """
    Generates a realistic list of parsed resumes across different domains
    (DevOps, Backend, Frontend, Data Science) with labels indicating suitability for a DevOps role.
    """
    domains = ["DevOps", "Backend", "Frontend", "DataScience"]
    degrees = ["Bachelor", "Master", "PhD", "None"]
    universities = ["MIT", "Stanford", "UC Berkeley", "Carnegie Mellon", "Georgia Tech", "Unknown"]
    
    skills_by_domain = {
        "DevOps": ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD", "Jenkins", "Ansible", "Git", "Python", "Linux"],
        "Backend": ["Python", "FastAPI", "Go", "Golang", "PostgreSQL", "Redis", "Docker", "Java", "Spring Boot", "MySQL"],
        "Frontend": ["Javascript", "Typescript", "React", "Vue", "Angular", "HTML", "CSS", "Next.js", "TailwindCSS"],
        "DataScience": ["Python", "Machine Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn", "SQL"]
    }
    
    resumes = []
    rng = np.random.default_rng(42)  # Seed for reproducibility
    
    for i in range(1, count + 1):
        domain = rng.choice(domains, p=[0.35, 0.25, 0.20, 0.20])
        degree = rng.choice(degrees, p=[0.60, 0.25, 0.05, 0.10])
        uni = rng.choice(universities)
        grad_year = int(rng.integers(2010, 2026))
        
        # Determine experience and skills
        exp_years = float(round(rng.uniform(0.5, 15.0), 1))
        
        # Select base domain skills
        base_skills = skills_by_domain[domain]
        num_skills = rng.integers(3, len(base_skills) + 1)
        selected_skills = list(rng.choice(base_skills, size=num_skills, replace=False))
        
        # Add a couple of random cross-domain skills
        other_domain = rng.choice([d for d in domains if d != domain])
        selected_skills.extend(list(rng.choice(skills_by_domain[other_domain], size=rng.integers(0, 3), replace=False)))
        selected_skills = list(set(selected_skills))
        
        # Formulate resume text summary for embedding generation
        resume_text = f"Resume of Candidate {i}. Domain: {domain}. Experience: {exp_years} years. " \
                      f"Education: {degree} in Computer Science from {uni} ({grad_year}). " \
                      f"Skills: {', '.join(selected_skills)}."
        
        embedding = generate_deterministic_embedding(resume_text)
        
        # Determine DevOps suitability label
        # Ideal DevOps candidate: Domain is DevOps, or (skills overlap >= 4 and experience >= 2.0 years)
        devops_overlap = sum(1 for s in selected_skills if s.lower() in TARGET_DEVOPS_SKILLS)
        
        if domain == "DevOps" and exp_years >= 2.0:
            label = 1
        elif devops_overlap >= 4 and exp_years >= 2.0:
            label = 1
        else:
            label = 0
            
        resumes.append({
            "resume_id": i,
            "user_id": int(rng.integers(100, 1000)),
            "filename": f"candidate_{i}_{domain.lower()}.pdf",
            "skills": selected_skills,
            "experience_years": exp_years,
            "education": {
                "degree": degree,
                "university": uni,
                "graduation_year": grad_year if degree != "None" else None
            },
            "embedding": embedding,
            "label": label
        })
        
    return resumes

def load_and_validate_dataset() -> pd.DataFrame:
    """
    Loads dataset from json. Fallback to generating synthetic data if the json
    file is empty, missing, or contains fewer than 10 entries.
    """
    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
    
    data = []
    if os.path.exists(DATASET_PATH):
        try:
            with open(DATASET_PATH, "r") as f:
                data = json.load(f)
            logger.info(f"Successfully loaded {len(data)} records from {DATASET_PATH}")
        except Exception as e:
            logger.error(f"Error reading dataset file: {e}. Re-generating.")
            
    # Trigger synthetic fallback if database export is empty or trivial
    if len(data) < 10:
        logger.warning(f"Dataset at {DATASET_PATH} has only {len(data)} records. Generating synthetic training dataset of 250 records...")
        data = create_synthetic_resumes(250)
        with open(DATASET_PATH, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Saved synthetic dataset to {DATASET_PATH}")
        
    df = pd.DataFrame(data)
    
    # --- VALIDATION STAGE ---
    logger.info("Executing dataset validation checks...")
    
    # 1. Schema Validation
    required_cols = ["resume_id", "skills", "experience_years", "education", "embedding", "label"]
    for col in required_cols:
        if col not in df.columns:
            if col == "label":
                # Generate label dynamically if it was missing in database export
                logger.warning("Target column 'label' missing. Generating labels based on DevOps matching heuristic.")
                df["label"] = df.apply(
                    lambda row: 1 if (
                        any(s.lower() in TARGET_DEVOPS_SKILLS for s in row["skills"]) 
                        and row["experience_years"] is not None 
                        and float(row["experience_years"]) >= 3.0
                    ) else 0, axis=1
                )
            else:
                raise ValueError(f"Schema validation failed: Missing required field '{col}'")
                
    # 2. Duplicate Detection
    initial_len = len(df)
    df.drop_duplicates(subset=["resume_id"], keep="first", inplace=True)
    duplicate_count = initial_len - len(df)
    if duplicate_count > 0:
        logger.warning(f"Dropped {duplicate_count} duplicate candidate rows.")
        
    # 3. Missing Value Identification
    missing_counts = df[required_cols].isna().sum()
    for col, count in missing_counts.items():
        if count > 0:
            logger.warning(f"Field '{col}' has {count} missing values. Filling default values.")
            if col == "experience_years":
                df["experience_years"] = df["experience_years"].fillna(0.0)
            elif col == "skills":
                df["skills"] = df["skills"].apply(lambda x: x if isinstance(x, list) else [])
            elif col == "education":
                df["education"] = df["education"].apply(lambda x: x if isinstance(x, dict) else {"degree": "Unknown"})
                
    # 4. Label Integrity Check
    invalid_labels = df[~df["label"].isin([0, 1])]
    if not invalid_labels.empty:
        logger.error(f"Found {len(invalid_labels)} rows with invalid labels (not 0 or 1). Coercing to binary values.")
        df["label"] = df["label"].apply(lambda l: 1 if l == 1 else 0)
        
    logger.info(f"Dataset validation completed. Loaded dataset contains {len(df)} records.")
    logger.info(f"Class distribution: {df['label'].value_counts().to_dict()}")
    
    return df

if __name__ == "__main__":
    df = load_and_validate_dataset()
    print(df.head())
