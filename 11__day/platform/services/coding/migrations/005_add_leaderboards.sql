-- +goose Up
CREATE TABLE IF NOT EXISTS leaderboards (
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

CREATE INDEX IF NOT EXISTS idx_leaderboards_problem ON leaderboards(problem_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_score ON leaderboards(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_runtime ON leaderboards(runtime ASC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_memory ON leaderboards(memory ASC);

-- +goose Down
DROP TABLE IF EXISTS leaderboards;
