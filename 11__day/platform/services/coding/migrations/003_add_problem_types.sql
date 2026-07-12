-- +goose Up
ALTER TABLE coding_problems 
ADD COLUMN IF NOT EXISTS problem_type VARCHAR(50) NOT NULL DEFAULT 'ALGORITHM' 
CHECK (problem_type IN ('ALGORITHM', 'DATABASE_SQL', 'SHELL', 'REGEX', 'DEBUGGING', 'MULTI_FILE'));

-- +goose Down
ALTER TABLE coding_problems 
DROP COLUMN IF EXISTS problem_type;
