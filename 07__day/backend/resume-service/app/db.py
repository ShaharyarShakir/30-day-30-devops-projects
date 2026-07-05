import os
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
    """
    Returns a PostgreSQL database connection.
    """
    conn_str = f"host={DB_HOST} port={DB_PORT} user={DB_USER} password={DB_PASSWORD} dbname={DB_NAME}"
    return psycopg2.connect(conn_str)

def init_db():
    """
    Connects to database with retries and initializes the resumes table.
    """
    err = None
    for i in range(10):
        try:
            conn = get_connection()
            cur = conn.cursor()
            # Create resumes table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS resumes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    object_key VARCHAR(255) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    error_message TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            # Migration to add error_message column if table already exists from Phase 2
            cur.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS error_message TEXT;")
            conn.commit()
            cur.close()
            conn.close()
            logger.info("Resumes database initialized successfully")
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
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO resumes (user_id, filename, object_key, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id, user_id, filename, object_key, status, created_at;
                """,
                (user_id, filename, object_key, status)
            )
            result = cur.fetchone()
            conn.commit()
            return dict(result)
    finally:
        conn.close()

def get_resume(resume_id: int) -> dict:
    """
    Retrieves resume metadata by ID.
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, user_id, filename, object_key, status, created_at FROM resumes WHERE id = %s;",
                (resume_id,)
            )
            result = cur.fetchone()
            return dict(result) if result else None
    finally:
        conn.close()

def delete_resume(resume_id: int) -> bool:
    """
    Deletes a resume metadata record by ID.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM resumes WHERE id = %s RETURNING object_key;", (resume_id,))
            result = cur.fetchone()
            conn.commit()
            return result is not None
    finally:
        conn.close()
