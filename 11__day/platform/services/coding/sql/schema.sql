CREATE TABLE coding_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    problem_type VARCHAR(50) NOT NULL DEFAULT 'ALGORITHM' CHECK (problem_type IN ('ALGORITHM', 'DATABASE_SQL', 'SHELL', 'REGEX', 'DEBUGGING', 'MULTI_FILE')),
    statement TEXT NOT NULL,
    constraints TEXT,
    time_limit_ms INTEGER NOT NULL DEFAULT 2000,
    memory_limit_mb INTEGER NOT NULL DEFAULT 256,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE problem_languages (
    problem_id UUID NOT NULL REFERENCES coding_problems(id),
    language VARCHAR(50) NOT NULL,
    starter_code TEXT,
    PRIMARY KEY (problem_id, language)
);

CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES coding_problems(id),
    input TEXT,
    expected_output TEXT,
    hidden BOOLEAN NOT NULL DEFAULT false,
    weight INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL REFERENCES coding_problems(id),
    language VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    score INTEGER,
    runtime BIGINT,
    memory BIGINT,
    code TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE submission_results (
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

CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE TABLE compilation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES coding_problems(id),
    language VARCHAR(50) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    binary_path VARCHAR(512) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(problem_id, language, code_hash)
);

CREATE INDEX idx_compilation_cache_code_hash ON compilation_cache(code_hash);
CREATE INDEX idx_compilation_cache_last_used ON compilation_cache(last_used_at);

CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID REFERENCES coding_problems(id),
    user_id UUID NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    runtime BIGINT,
    memory BIGINT,
    language VARCHAR(50),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(problem_id, user_id)
);

CREATE INDEX idx_leaderboards_problem ON leaderboards(problem_id);
CREATE INDEX idx_leaderboards_score ON leaderboards(score DESC);
CREATE INDEX idx_leaderboards_runtime ON leaderboards(runtime ASC);
CREATE INDEX idx_leaderboards_memory ON leaderboards(memory ASC);
