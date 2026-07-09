-- Initialize MLflow database
-- This script runs automatically when PostgreSQL starts

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The database is already created via POSTGRES_DB environment variable
-- Additional setup can be added here as needed
