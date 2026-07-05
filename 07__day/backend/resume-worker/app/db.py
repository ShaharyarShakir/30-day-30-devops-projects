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
            logger.info("Worker database connection check succeeded")
            return
        except Exception as e:
            err = e
            logger.warning(f"Worker failed database ping (attempt {i+1}/10): {e}. Retrying in 2 seconds...")
            time.sleep(2)
    raise err

def update_resume_status(resume_id: int, status: str, error_message: str = None):
    """
    Updates the status and optional error message of a resume.
    """
    with Session(engine) as session:
        db_resume = session.get(Resume, resume_id)
        if db_resume:
            db_resume.status = status
            db_resume.error_message = error_message
            session.add(db_resume)
            session.commit()
            logger.info(f"Updated resume ID {resume_id} status to {status}")

def save_features(resume_id: int, embedding: list, skills: list, experience_years: float, education: dict) -> dict:
    """
    Saves/Upserts the parsed features and embeddings in the database.
    """
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
