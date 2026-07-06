import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple

from ml.training.config import TARGET_DEVOPS_SKILLS
from ml.training.preprocess import clean_skills, extract_degree_level
from ml.training.data_loader import generate_deterministic_embedding

# Define a standard target DevOps job profile for embedding similarity calculations
TARGET_DEVOPS_PROFILE_TEXT = (
    "Senior DevOps Engineer with extensive experience in Docker, Kubernetes, AWS Cloud, "
    "Terraform Infrastructure as Code, CI/CD pipelines, Jenkins, Git, Ansible configuration, "
    "and Python scripting."
)
TARGET_DEVOPS_EMBEDDING = np.array(generate_deterministic_embedding(TARGET_DEVOPS_PROFILE_TEXT))

# Education degree ranks
DEGREE_RANKS = {
    "None": 0,
    "Bachelor": 1,
    "Master": 2,
    "PhD": 3
}

def compute_cosine_similarity(vec_a: List[float], vec_b: np.ndarray) -> float:
    """
    Computes cosine similarity between two vectors.
    Since both are L2 normalized, it's equivalent to the dot product.
    """
    if not vec_a or len(vec_a) == 0:
        return 0.0
    a = np.array(vec_a)
    # Ensure dimensions match
    if a.shape != vec_b.shape:
        return 0.0
        
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(vec_b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    return float(np.dot(a, vec_b) / (norm_a * norm_b))

def extract_features_df(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Processes the raw DataFrame and extracts numerical/categorical features for ML models.
    """
    processed_rows = []
    
    for idx, row in df.iterrows():
        # Preprocess fields
        cleaned_skills = clean_skills(row["skills"])
        
        edu_dict = row["education"]
        if isinstance(edu_dict, dict):
            degree = edu_dict.get("degree", "None")
        else:
            degree = "None"
        edu_level = extract_degree_level(degree)
        edu_rank = DEGREE_RANKS.get(edu_level, 0)
        
        # 1. Experience Years
        exp_years = float(row["experience_years"]) if row["experience_years"] is not None else 0.0
        
        # 2. Skill overlap features
        skill_overlap = [s for s in cleaned_skills if s.lower() in TARGET_DEVOPS_SKILLS]
        skill_match_count = len(skill_overlap)
        skill_match_ratio = skill_match_count / len(TARGET_DEVOPS_SKILLS) if TARGET_DEVOPS_SKILLS else 0.0
        
        # 3. Vector embedding similarity feature
        embedding_sim = compute_cosine_similarity(row["embedding"], TARGET_DEVOPS_EMBEDDING)
        
        # Build base feature dictionary
        feat_dict = {
            "resume_id": row["resume_id"],
            "experience_years": exp_years,
            "education_rank": edu_rank,
            "skill_match_count": skill_match_count,
            "skill_match_ratio": skill_match_ratio,
            "embedding_similarity": embedding_sim
        }
        
        # 4. Multi-hot encoding for specific target DevOps skills
        for skill in TARGET_DEVOPS_SKILLS:
            feat_dict[f"has_{skill}"] = 1 if skill.lower() in cleaned_skills else 0
            
        processed_rows.append(feat_dict)
        
    features_df = pd.DataFrame(processed_rows)
    features_df.set_index("resume_id", inplace=True)
    
    labels = df.set_index("resume_id")["label"]
    
    return features_df, labels

if __name__ == "__main__":
    from ml.training.data_loader import load_and_validate_dataset
    df = load_and_validate_dataset()
    X, y = extract_features_df(df)
    print("Features shape:", X.shape)
    print(X.head())
