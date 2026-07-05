import os
import json
import time
import logging
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

DB_HOST = os.getenv("POSTGRES_HOST", "postgres")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_NAME = os.getenv("POSTGRES_DB", "resume_ai")

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME
    )

def init_db():
    # Database is initialized by microservices, but we run a ping check for synchronization
    err = None
    for i in range(10):
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("SELECT 1;")
            conn.commit()
            cur.close()
            conn.close()
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
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE resumes
                SET status = %s, error_message = %s
                WHERE id = %s;
                """,
                (status, error_message, resume_id)
            )
            conn.commit()
            logger.info(f"Updated resume ID {resume_id} status to {status}")
    finally:
        conn.close()

def save_features(resume_id: int, embedding: list, skills: list, experience_years: float, education: dict) -> dict:
    """
    Saves/Upserts the parsed features and embeddings in the database.
    """
    embedding_str = "[" + ",".join(map(str, embedding)) + "]"
    
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO resume_features (resume_id, embedding, skills, experience_years, education)
                VALUES (%s, %s::vector, %s, %s, %s)
                ON CONFLICT (resume_id) 
                DO UPDATE SET 
                    embedding = EXCLUDED.embedding,
                    skills = EXCLUDED.skills,
                    experience_years = EXCLUDED.experience_years,
                    education = EXCLUDED.education,
                    processed_at = CURRENT_TIMESTAMP
                RETURNING id, resume_id, skills, experience_years, education;
                """,
                (resume_id, embedding_str, json.dumps(skills), experience_years, json.dumps(education))
            )
            result = cur.fetchone()
            conn.commit()
            return dict(result)
    finally:
        conn.close()
