import io
import re
import unicodedata
from pypdf import PdfReader

# Keywords list for skill extraction (with standard capitalization)
SKILLS_LIST = [
    "Go", "Python", "Java", "Docker", "Kubernetes", "Terraform", "AWS", "Azure", "GCP",
    "Linux", "Git", "Ansible", "Jenkins", "React", "Node.js", "PostgreSQL", "Redis", "Kafka",
    "Golang", "Kubernetes", "MySQL", "MongoDB", "SQLite", "FastAPI", "Flask", "Django",
    "Vue", "Angular", "Next.js", "Machine Learning", "Deep Learning", "NLP", "TensorFlow", "PyTorch"
]

# Standard roles list for experience extraction
ROLES_LIST = [
    "Backend Engineer", "DevOps Engineer", "Software Engineer", "Frontend Engineer",
    "Fullstack Engineer", "Data Engineer", "Machine Learning Engineer", "ML Engineer",
    "Software Developer", "Developer", "Systems Engineer", "Cloud Architect", "Project Manager"
]

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts raw text from PDF bytes.
    """
    reader = PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def clean_and_normalize_text(text: str) -> str:
    """
    Cleans and normalizes raw text.
    """
    # 1. Normalize Unicode (NFKC)
    text = unicodedata.normalize('NFKC', text)
    
    # 2. Split into lines, clean extra spaces, and filter duplicates
    lines = text.split('\n')
    seen_lines = set()
    clean_lines = []
    
    for line in lines:
        # Remove duplicate spaces and strip
        line = re.sub(r'\s+', ' ', line).strip()
        if not line:
            continue
            
        # Skip generic headers/footers (e.g. single numbers for page counts)
        if re.match(r'^page\s+\d+\s*(of\s*\d+)?$', line.lower()) or re.match(r'^\d+$', line):
            continue
            
        # Check for exact duplicate lines to clean up text artifact repetitions
        if line.lower() not in seen_lines:
            seen_lines.add(line.lower())
            clean_lines.append(line)
            
    return '\n'.join(clean_lines)

def extract_skills(text: str) -> list:
    """
    Extracts tech skills from text matching SKILLS_LIST.
    """
    clean_text = text.lower()
    skills = []
    
    for skill in SKILLS_LIST:
        # Use word boundaries to prevent substring matching
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, clean_text):
            # Normalize Golang/Go duplicate matching
            if skill.lower() in ("go", "golang"):
                if "Go" not in skills:
                    skills.append("Go")
            else:
                skills.append(skill)
                
    return skills

def extract_experience(text: str) -> dict:
    """
    Extracts experience: total years (numeric) and roles list.
    """
    clean_text = text.lower()
    
    # 1. Extract years
    # Search for patterns like: "5 years", "3+ yrs", "4 years of experience"
    years = 0
    patterns = [
        r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b\s*(?:of\s*)?(?:experience|work|industry)?',
        r'(?:experience|work)\s*:\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)'
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, clean_text)
        if matches:
            # Get the maximum value found to represent total experience
            try:
                found_years = max(float(m) for m in matches)
                if found_years > years:
                    years = int(found_years) if found_years.is_integer() else found_years
            except ValueError:
                pass
                
    # 2. Extract roles
    roles = []
    for role in ROLES_LIST:
        pattern = r'\b' + re.escape(role.lower()) + r'\b'
        if re.search(pattern, clean_text):
            roles.append(role)
            
    return {
        "years": years,
        "roles": roles
    }

def extract_education(text: str) -> dict:
    """
    Extracts education: degree, university, graduation year.
    """
    # 1. Degree
    degree = "Unknown"
    degree_patterns = [
        (r'\b(b\.s\.|bs|bachelor|b\.tech|btech|b\.a\.|ba)\b\s*(?:of|in)?\s*([a-zA-Z\s]{3,30})', "Bachelor"),
        (r'\b(m\.s\.|ms|master|m\.tech|mtech|m\.a\.|ma)\b\s*(?:of|in)?\s*([a-zA-Z\s]{3,30})', "Master"),
        (r'\b(phd|ph\.d\.|doctor)\b\s*(?:of|in)?\s*([a-zA-Z\s]{3,30})', "PhD")
    ]
    
    for pattern, deg_name in degree_patterns:
        match = re.search(pattern, text.lower())
        if match:
            major = match.group(2).strip().title()
            degree = f"{deg_name} in {major}" if major else deg_name
            break
            
    if degree == "Unknown":
        # Fallback check for simple degree words
        if re.search(r'\bbachelor\b', text.lower()):
            degree = "Bachelor"
        elif re.search(r'\bmaster\b', text.lower()):
            degree = "Master"
        elif re.search(r'\bphd\b', text.lower()):
            degree = "PhD"
            
    # 2. University
    university = "Unknown"
    uni_patterns = [
        r'\b([a-zA-Z\s]{3,50}\s+(?:university|college|institute|polytechnic|academy))\b',
        r'\b(?:university|college|institute|polytechnic)\s+(?:of|at)\s+([a-zA-Z\s]{3,40})\b'
    ]
    
    for pattern in uni_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            university = match.group(1).strip()
            break
            
    # 3. Graduation year
    graduation_year = None
    # Find four digit years between 2000 and 2032
    years = re.findall(r'\b(20[0-2][0-9]|203[0-2])\b', text)
    if years:
        # Usually the graduation year is the highest year mentioned in education context, or simply the last year
        graduation_year = int(max(years))
        
    return {
        "degree": degree,
        "university": university,
        "graduation_year": graduation_year
    }

def parse_pdf_resume(pdf_bytes: bytes) -> dict:
    """
    Extracts, cleans, and parses structured entities from raw PDF bytes.
    """
    raw_text = extract_text_from_pdf(pdf_bytes)
    cleaned_text = clean_and_normalize_text(raw_text)
    
    skills = extract_skills(cleaned_text)
    experience = extract_experience(cleaned_text)
    education = extract_education(cleaned_text)
    
    return {
        "text": cleaned_text,
        "skills": skills,
        "experience": experience,
        "education": education
    }
