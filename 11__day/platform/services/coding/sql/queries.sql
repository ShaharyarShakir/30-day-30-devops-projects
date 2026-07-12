-- name: GetProblemByID :one
SELECT * FROM coding_problems WHERE id = $1;

-- name: GetProblemBySlug :one
SELECT * FROM coding_problems WHERE slug = $1;

-- name: ListProblems :many
SELECT * FROM coding_problems ORDER BY created_at DESC;

-- name: CreateProblem :one
INSERT INTO coding_problems (title, slug, difficulty, statement, constraints, time_limit_ms, memory_limit_mb)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateProblem :one
UPDATE coding_problems
SET title = $2, difficulty = $3, statement = $4, constraints = $5, time_limit_ms = $6, memory_limit_mb = $7
WHERE id = $1
RETURNING *;

-- name: DeleteProblem :exec
DELETE FROM coding_problems WHERE id = $1;

-- name: GetProblemLanguages :many
SELECT * FROM problem_languages WHERE problem_id = $1;

-- name: CreateProblemLanguage :one
INSERT INTO problem_languages (problem_id, language, starter_code)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetTestCasesByProblemID :many
SELECT * FROM test_cases WHERE problem_id = $1 ORDER BY created_at ASC;

-- name: CreateTestCase :one
INSERT INTO test_cases (problem_id, input, expected_output, hidden, weight)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetSubmissionByID :one
SELECT * FROM submissions WHERE id = $1;

-- name: ListSubmissionsByUser :many
SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100;

-- name: ListSubmissionsByProblem :many
SELECT * FROM submissions WHERE problem_id = $1 ORDER BY created_at DESC LIMIT 100;

-- name: CreateSubmission :one
INSERT INTO submissions (user_id, problem_id, language, code)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateSubmission :one
UPDATE submissions
SET status = $2, score = $3, runtime = $4, memory = $5
WHERE id = $1
RETURNING *;

-- name: GetSubmissionResults :many
SELECT * FROM submission_results WHERE submission_id = $1;

-- name: CreateSubmissionResult :one
INSERT INTO submission_results (submission_id, test_case_id, runtime, memory, status, stdout, stderr)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: CreateOutboxEvent :one
INSERT INTO outbox (aggregate_id, aggregate_type, event_type, payload)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListPendingOutboxEvents :many
SELECT * FROM outbox WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT 100;

-- name: MarkOutboxEventAsProcessed :exec
UPDATE outbox SET processed_at = NOW() WHERE id = $1;
