import os
import time
import logging
from datetime import datetime
from sqlmodel import SQLModel, create_engine, Session, select

from app.models import Resume, ResumeFeature

logger = logging.getLogger(__name__)

DB_HOST = os.getenv("POSTGRES_HOST", "postgres")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_NAME = os.getenv("POSTGRES_DB", "resume_ai")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    # Database is initialized by microservices, but we run a ping check for synchronization
    err = None
    for i in range(10):
        try:
            with Session(engine) as session:
                session.execute(select(1))
            logger.info("ML database connection check succeeded")
            return
        except Exception as e:
            err = e
            logger.warning(f"ML failed database ping (attempt {i+1}/10): {e}. Retrying in 2 seconds...")
            time.sleep(2)
    raise err

def get_resume_metadata(resume_id: int) -> dict:
    with Session(engine) as session:
        db_resume = session.get(Resume, resume_id)
        return db_resume.model_dump() if db_resume else None

def get_features(resume_id: int) -> dict:
    with Session(engine) as session:
        statement = select(ResumeFeature).where(ResumeFeature.resume_id == resume_id)
        db_feature = session.exec(statement).first()
        return db_feature.model_dump() if db_feature else None

def save_features(resume_id: int, embedding: list, skills: list, experience_years: float, education: dict) -> dict:
    with Session(engine) as session:
        statement = select(ResumeFeature).where(ResumeFeature.resume_id == resume_id)
        db_feature = session.exec(statement).first()
        
        if not db_feature:
            db_feature = ResumeFeature(
                resume_id=resume_id,
                embedding=embedding,
                skills=skills,
                experience_years=experience_years,
                education=education
            )
            session.add(db_feature)
        else:
            db_feature.embedding = embedding
            db_feature.skills = skills
            db_feature.experience_years = experience_years
            db_feature.education = education
            db_feature.processed_at = datetime.utcnow()
            session.add(db_feature)
            
        session.commit()
        session.refresh(db_feature)
        return db_feature.model_dump()

def get_similar_resumes(resume_id: int, embedding: list, limit: int = 5) -> list:
    with Session(engine) as session:
        # Distance calculation via pgvector cosine_distance
        distance = ResumeFeature.embedding.cosine_distance(embedding)
        similarity_score = (1.0 - distance).label("similarity_score")
        
        statement = (
            select(
                ResumeFeature.resume_id,
                Resume.filename,
                Resume.user_id,
                similarity_score,
                ResumeFeature.skills
            )
            .join(Resume, ResumeFeature.resume_id == Resume.id)
            .where(ResumeFeature.resume_id != resume_id)
            .order_by(distance.asc())
            .limit(limit)
        )
        
        results = session.exec(statement).all()
        
        return [
            {
                "resume_id": row.resume_id,
                "filename": row.filename,
                "user_id": row.user_id,
                "similarity_score": float(row.similarity_score) if row.similarity_score is not None else 0.0,
                "skills": row.skills
            }
            for row in results
        ]
