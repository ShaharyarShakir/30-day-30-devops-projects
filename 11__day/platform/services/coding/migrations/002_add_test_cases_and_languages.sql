-- +goose Up
ALTER TABLE coding_problems 
ADD COLUMN IF NOT EXISTS constraints TEXT,
ADD COLUMN IF NOT EXISTS time_limit_ms INTEGER NOT NULL DEFAULT 2000,
ADD COLUMN IF NOT EXISTS memory_limit_mb INTEGER NOT NULL DEFAULT 256;

CREATE TABLE IF NOT EXISTS problem_languages (
    problem_id UUID NOT NULL REFERENCES coding_problems(id),
    language VARCHAR(50) NOT NULL,
    starter_code TEXT,
    PRIMARY KEY (problem_id, language)
);

CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES coding_problems(id),
    input TEXT,
    expected_output TEXT,
    hidden BOOLEAN NOT NULL DEFAULT false,
    weight INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submission_results (
    submission_id UUID NOT NULL REFERENCES submissions(id),
    test_case_id UUID NOT NULL REFERENCES test_cases(id),
    runtime BIGINT,
    memory BIGINT,
    status VARCHAR(50) NOT NULL,
    stdout TEXT,
    stderr TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (submission_id, test_case_id)
);

-- +goose Down
DROP TABLE IF EXISTS submission_results;
DROP TABLE IF EXISTS test_cases;
DROP TABLE IF EXISTS problem_languages;
ALTER TABLE coding_problems 
DROP COLUMN IF EXISTS constraints,
DROP COLUMN IF EXISTS time_limit_ms,
DROP COLUMN IF EXISTS memory_limit_mb;
