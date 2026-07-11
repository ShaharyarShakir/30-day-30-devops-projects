-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_id UUID,
    aggregate_type TEXT,
    event_type TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP
);

CREATE INDEX idx_outbox_events_unpublished ON outbox_events (created_at) WHERE published_at IS NULL;

CREATE TABLE inbox_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMP NOT NULL
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP TABLE IF EXISTS inbox_events;
DROP INDEX IF EXISTS idx_outbox_events_unpublished;
DROP TABLE IF EXISTS outbox_events;
