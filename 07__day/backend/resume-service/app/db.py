import os
import time
import logging
from sqlmodel import SQLModel, create_engine, Session, select
from alembic.config import Config
from alembic import command

from app.models import Resume

logger = logging.getLogger(__name__)

DB_HOST = os.getenv("POSTGRES_HOST", "postgres")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_NAME = os.getenv("POSTGRES_DB", "resume_ai")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL, echo=False)

def run_migrations():
    """
    Runs Alembic database migrations programmatically on startup.
    """
    try:
        # Load Alembic configuration and run upgrade head
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Alembic database migrations applied successfully")
    except Exception as e:
        logger.error(f"Failed to run database migrations: {e}")
        raise e

def init_db():
    """
    Connects to database with retries and initializes/migrates the schema using Alembic.
    """
    err = None
    for i in range(10):
        try:
            # Test connection using a simple select
            with Session(engine) as session:
                session.execute(select(1))
            logger.info("Connected to database successfully. Running migrations...")
            run_migrations()
            return
        except Exception as e:
            err = e
            logger.warning(f"Failed to connect to database (attempt {i+1}/10): {e}. Retrying in 2 seconds...")
            time.sleep(2)
    
    logger.error("Could not connect to database after 10 attempts.")
    raise err

def insert_resume(user_id: int, filename: str, object_key: str, status: str = "uploaded") -> dict:
    """
    Inserts a new resume metadata record and returns it.
    """
    with Session(engine) as session:
        db_resume = Resume(
            user_id=user_id,
            filename=filename,
            object_key=object_key,
            status=status
        )
        session.add(db_resume)
        session.commit()
        session.refresh(db_resume)
        return db_resume.model_dump()

def get_resume(resume_id: int) -> dict:
    """
    Retrieves resume metadata by ID.
    """
    with Session(engine) as session:
        db_resume = session.get(Resume, resume_id)
        return db_resume.model_dump() if db_resume else None

def delete_resume(resume_id: int) -> bool:
    """
    Deletes a resume metadata record by ID.
    """
    with Session(engine) as session:
        db_resume = session.get(Resume, resume_id)
        if db_resume:
            session.delete(db_resume)
            session.commit()
            return True
        return False
