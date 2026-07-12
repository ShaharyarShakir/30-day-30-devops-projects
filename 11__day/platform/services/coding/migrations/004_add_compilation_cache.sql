-- +goose Up
CREATE TABLE IF NOT EXISTS compilation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES coding_problems(id),
    language VARCHAR(50) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    binary_path VARCHAR(512) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(problem_id, language, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_compilation_cache_code_hash ON compilation_cache(code_hash);
CREATE INDEX IF NOT EXISTS idx_compilation_cache_last_used ON compilation_cache(last_used_at);

-- +goose Down
DROP TABLE IF EXISTS compilation_cache;
