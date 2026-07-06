import re
from typing import List, Dict, Any

# Synonym mappings for skill cleaning
SKILL_MAP = {
    "k8s": "kubernetes",
    "golang": "go",
    "postgres": "postgresql",
    "postgres database": "postgresql",
    "neural networks": "deep learning",
    "machinelearning": "machine learning",
    "deeplearning": "deep learning",
    "nlp": "nlp",
    "fast api": "fastapi"
}

def clean_skills(skills: List[str]) -> List[str]:
    """
    Cleans, lowercases, and maps duplicate/synonymous skills.
    """
    if not isinstance(skills, list):
        return []
        
    cleaned = []
    for skill in skills:
        if not isinstance(skill, str):
            continue
        cleaned_skill = skill.strip().lower()
        # Apply standard mappings
        cleaned_skill = SKILL_MAP.get(cleaned_skill, cleaned_skill)
        if cleaned_skill:
            cleaned.append(cleaned_skill)
            
    return list(sorted(set(cleaned)))

def extract_degree_level(degree: Any) -> str:
    """
    Standardizes degree names into high-level categories: PhD, Master, Bachelor, None.
    """
    if not degree or not isinstance(degree, str):
        return "None"
        
    deg_lower = degree.lower()
    
    if any(p in deg_lower for p in ["phd", "ph.d", "doctorate"]):
        return "PhD"
    elif any(m in deg_lower for m in ["master", "ms", "m.s.", "m.tech", "mba"]):
        return "Master"
    elif any(b in deg_lower for b in ["bachelor", "bs", "b.s.", "b.tech", "ba"]):
        return "Bachelor"
        
    return "None"

def preprocess_candidate(candidate: Dict[str, Any]) -> Dict[str, Any]:
    """
    Preprocesses raw candidate attributes.
    """
    candidate["skills"] = clean_skills(candidate.get("skills", []))
    
    edu = candidate.get("education", {})
    if isinstance(edu, dict):
        degree = edu.get("degree", "None")
    else:
        degree = "None"
    candidate["education_level"] = extract_degree_level(degree)
    
    # Ensure experience_years is a float
    try:
        candidate["experience_years"] = float(candidate.get("experience_years", 0.0))
    except (ValueError, TypeError):
        candidate["experience_years"] = 0.0
        
    return candidate
