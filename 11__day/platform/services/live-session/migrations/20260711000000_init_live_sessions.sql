-- +goose Up
CREATE TABLE live_sessions (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL,
    instructor_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_live_sessions_course_id ON live_sessions (course_id);
CREATE INDEX idx_live_sessions_instructor_id ON live_sessions (instructor_id);

CREATE TABLE participants (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    joined_at TIMESTAMP,
    left_at TIMESTAMP
);

CREATE INDEX idx_participants_session_user ON participants (session_id, user_id);

CREATE TABLE attendance (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    duration INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_attendance_session_user UNIQUE (session_id, user_id)
);

CREATE INDEX idx_attendance_session_user ON attendance (session_id, user_id);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP
);

CREATE INDEX idx_outbox_events_unpublished ON outbox_events (created_at) WHERE published_at IS NULL;

-- +goose Down
DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS live_sessions;
