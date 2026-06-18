-- +goose Up
ALTER TABLE chunks
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_chunks_status
ON chunks(status);

-- +goose Down
DROP INDEX IF EXISTS idx_chunks_status;

ALTER TABLE chunks
DROP COLUMN IF EXISTS status;