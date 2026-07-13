-- name: CreateLiveSession :one
INSERT INTO live_sessions (id, course_id, instructor_id, title, description, scheduled_at, started_at, ended_at, status, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetLiveSessionByID :one
SELECT * FROM live_sessions WHERE id = $1;

-- name: ListLiveSessionsByCourse :many
SELECT * FROM live_sessions WHERE course_id = $1 ORDER BY created_at DESC;

-- name: UpdateLiveSessionStatus :one
UPDATE live_sessions
SET status = $2, started_at = $3, ended_at = $4
WHERE id = $1
RETURNING *;

-- name: UpdateLiveSessionDetails :one
UPDATE live_sessions
SET title = $2, description = $3, scheduled_at = $4
WHERE id = $1
RETURNING *;

-- name: DeleteLiveSession :exec
DELETE FROM live_sessions WHERE id = $1;

-- name: CreateParticipant :one
INSERT INTO participants (id, session_id, user_id, role, joined_at, left_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetParticipant :one
SELECT * FROM participants
WHERE session_id = $1 AND user_id = $2
ORDER BY joined_at DESC
LIMIT 1;

-- name: UpdateParticipantLeft :one
UPDATE participants
SET left_at = $3
WHERE session_id = $1 AND user_id = $2 AND left_at IS NULL
RETURNING *;

-- name: UpsertAttendance :one
INSERT INTO attendance (id, session_id, user_id, duration)
VALUES ($1, $2, $3, $4)
ON CONFLICT (session_id, user_id)
DO UPDATE SET duration = attendance.duration + EXCLUDED.duration
RETURNING *;

-- name: GetAttendance :one
SELECT * FROM attendance WHERE session_id = $1 AND user_id = $2;

-- name: ListAttendanceBySession :many
SELECT * FROM attendance WHERE session_id = $1;

-- name: InsertOutboxEvent :exec
INSERT INTO outbox_events (id, aggregate_id, aggregate_type, event_type, payload, created_at)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: ListUnpublishedOutboxEvents :many
SELECT * FROM outbox_events
WHERE published_at IS NULL
ORDER BY created_at ASC
LIMIT $1;

-- name: MarkOutboxEventAsPublished :exec
UPDATE outbox_events
SET published_at = $2
WHERE id = $1;
