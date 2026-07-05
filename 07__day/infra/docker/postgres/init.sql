-- Runs once, on first container init, via docker-entrypoint-initdb.d

-- Enable pgvector on the main app database
CREATE EXTENSION IF NOT EXISTS vector;

-- MLflow needs its own database for experiment tracking metadata
SELECT 'CREATE DATABASE mlflow'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mlflow')
\gexec

