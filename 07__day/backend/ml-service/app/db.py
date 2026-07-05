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
    """
    Ensures vector extension is enabled and creates the resume_features table.
    """
    err = None
    for i in range(10):
        try:
            conn = get_connection()
            cur = conn.cursor()
            
            # Enable vector extension just in case
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            
            # Create resume_features table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS resume_features (
                    id SERIAL PRIMARY KEY,
                    resume_id INTEGER UNIQUE NOT NULL,
                    embedding vector(768) NOT NULL,
                    skills JSONB,
                    experience_years NUMERIC(4,1),
                    education JSONB,
                    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
                );
            """)
            # Migrations for existing database
            cur.execute("ALTER TABLE resume_features ADD COLUMN IF NOT EXISTS experience_years NUMERIC(4,1);")
            cur.execute("ALTER TABLE resume_features ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;")
            conn.commit()
            cur.close()
            conn.close()
            logger.info("ML features database initialized successfully")
            return
        except Exception as e:
            err = e
            logger.warning(f"Failed to connect to ML database (attempt {i+1}/10): {e}. Retrying in 2 seconds...")
            time.sleep(2)
            
    logger.error("Could not connect to ML database after 10 attempts.")
    raise err

def get_resume_metadata(resume_id: int) -> dict:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, filename, object_key, status, user_id, error_message FROM resumes WHERE id = %s;",
                (resume_id,)
            )
            result = cur.fetchone()
            return dict(result) if result else None
    finally:
        conn.close()

def get_features(resume_id: int) -> dict:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, resume_id, embedding, skills, experience_years, education FROM resume_features WHERE resume_id = %s;",
                (resume_id,)
            )
            result = cur.fetchone()
            return dict(result) if result else None
    finally:
        conn.close()

def save_features(resume_id: int, embedding: list, skills: list, experience_years: float, education: dict) -> dict:
    # Format embedding list to pgvector string format: [val1,val2,...]
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
                    education = EXCLUDED.education
                RETURNING id, resume_id, skills, experience_years, education;
                """,
                (resume_id, embedding_str, json.dumps(skills), experience_years, json.dumps(education))
            )
            result = cur.fetchone()
            conn.commit()
            return dict(result)
    finally:
        conn.close()

def get_similar_resumes(resume_id: int, embedding: list, limit: int = 5) -> list:
    embedding_str = "[" + ",".join(map(str, embedding)) + "]"
    
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # We use pgvector <=> operator for cosine distance. Similarity is 1 - distance.
            cur.execute(
                """
                SELECT 
                    rf.resume_id,
                    r.filename,
                    r.user_id,
                    1 - (rf.embedding <=> %s::vector) AS similarity_score,
                    rf.skills
                FROM resume_features rf
                JOIN resumes r ON rf.resume_id = r.id
                WHERE rf.resume_id != %s
                ORDER BY rf.embedding <=> %s::vector ASC
                LIMIT %s;
                """,
                (embedding_str, resume_id, embedding_str, limit)
            )
            results = cur.fetchall()
            return [dict(r) for r in results]
    finally:
        conn.close()
