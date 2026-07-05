#!/usr/bin/env python
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_NAME = os.getenv("POSTGRES_DB", "resume_ai")

def export_dataset():
    print("Connecting to PostgreSQL...")
    conn_str = f"host={DB_HOST} port={DB_PORT} user={DB_USER} password={DB_PASSWORD} dbname={DB_NAME}"
    conn = psycopg2.connect(conn_str)
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Query all embedded resumes and features
            cur.execute("""
                SELECT 
                    r.id AS resume_id,
                    r.user_id,
                    r.filename,
                    rf.skills,
                    rf.experience_years,
                    rf.education,
                    rf.embedding
                FROM resumes r
                JOIN resume_features rf ON r.id = rf.resume_id
                WHERE r.status = 'embedded';
            """)
            rows = cur.fetchall()
            
            # Format and convert pgvector output
            dataset = []
            for row in rows:
                row_dict = dict(row)
                
                # Parse embedding string [x,y,...] into float list
                embedding_str = row_dict["embedding"]
                embedding = []
                if isinstance(embedding_str, str):
                    clean_str = embedding_str.strip("[]")
                    if clean_str:
                        embedding = [float(x) for x in clean_str.split(",")]
                elif isinstance(embedding_str, list):
                    embedding = embedding_str
                
                row_dict["embedding"] = embedding
                # experience_years to float
                if row_dict["experience_years"] is not None:
                    row_dict["experience_years"] = float(row_dict["experience_years"])
                
                dataset.append(row_dict)
                
            output_dir = "ml/datasets/processed"
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, "dataset.json")
            
            with open(output_path, "w") as f:
                json.dump(dataset, f, indent=2)
                
            print(f"Successfully exported {len(dataset)} processed resumes to: {output_path}")
            
    finally:
        conn.close()

if __name__ == "__main__":
    export_dataset()
