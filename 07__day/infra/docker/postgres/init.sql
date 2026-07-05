-- Runs once, on first container init, via docker-entrypoint-initdb.d

-- Enable pgvector on the main app database
CREATE EXTENSION IF NOT EXISTS vector;

-- MLflow needs its own database for experiment tracking metadata
SELECT 'CREATE DATABASE mlflow'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mlflow')
\gexec

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    object_key VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create resume_features table
CREATE TABLE IF NOT EXISTS resume_features (
    id SERIAL PRIMARY KEY,
    resume_id INTEGER UNIQUE NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    skills JSONB,
    experience_years NUMERIC(4,1),
    education JSONB,
    embedding vector(768),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
