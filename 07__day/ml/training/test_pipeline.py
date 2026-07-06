import pytest
import pandas as pd
import numpy as np
from typing import Dict, Any

from ml.training.preprocess import clean_skills, extract_degree_level, preprocess_candidate
from ml.training.feature_engineering import compute_cosine_similarity, extract_features_df
from ml.training.data_loader import generate_deterministic_embedding

def test_clean_skills():
    # Test case conversion and whitespace trimming
    raw_skills = [" Python ", "k8s", "Docker", "GoLang"]
    cleaned = clean_skills(raw_skills)
    assert "python" in cleaned
    assert "kubernetes" in cleaned  # mapped k8s -> kubernetes
    assert "docker" in cleaned
    assert "go" in cleaned  # mapped golang -> go

def test_extract_degree_level():
    assert extract_degree_level("Bachelor of Science") == "Bachelor"
    assert extract_degree_level("M.S. in Computer Science") == "Master"
    assert extract_degree_level("Ph.D. in AI") == "PhD"
    assert extract_degree_level("High School") == "None"
    assert extract_degree_level(None) == "None"

def test_preprocess_candidate():
    raw_candidate = {
        "skills": ["Python", "K8s"],
        "education": {"degree": "Master of Science"},
        "experience_years": "5.5"
    }
    processed = preprocess_candidate(raw_candidate)
    assert processed["skills"] == ["kubernetes", "python"]
    assert processed["education_level"] == "Master"
    assert processed["experience_years"] == 5.5

def test_compute_cosine_similarity():
    # Same vector should have similarity of 1.0
    vec = [1.0, 2.0, 3.0]
    vec_np = np.array(vec)
    sim = compute_cosine_similarity(vec, vec_np)
    assert pytest.approx(sim, 0.0001) == 1.0
    
    # Orthogonal vectors should have similarity of 0.0
    vec_a = [1.0, 0.0, 0.0]
    vec_b = np.array([0.0, 1.0, 0.0])
    assert pytest.approx(compute_cosine_similarity(vec_a, vec_b), 0.0001) == 0.0

def test_extract_features_df():
    # Replicate raw dataset row
    dummy_data = [
        {
            "resume_id": 1,
            "skills": ["python", "docker", "aws"],
            "experience_years": 4.0,
            "education": {"degree": "Bachelor"},
            "embedding": generate_deterministic_embedding("Python developer with Docker and AWS experience"),
            "label": 1
        },
        {
            "resume_id": 2,
            "skills": ["react", "css"],
            "experience_years": 1.0,
            "education": {"degree": "None"},
            "embedding": generate_deterministic_embedding("Frontend React developer"),
            "label": 0
        }
    ]
    df = pd.DataFrame(dummy_data)
    X, y = extract_features_df(df)
    
    assert len(X) == 2
    assert len(y) == 2
    assert "experience_years" in X.columns
    assert "education_rank" in X.columns
    assert "embedding_similarity" in X.columns
    assert X.loc[1, "education_rank"] == 1  # Bachelor rank is 1
    assert X.loc[2, "education_rank"] == 0  # None rank is 0
    assert X.loc[1, "has_python"] == 1
    assert X.loc[2, "has_python"] == 0
    assert y.loc[1] == 1
    assert y.loc[2] == 0
