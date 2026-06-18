-- name: CreateChunk :one

INSERT INTO chunks (
    document_id,
    content
)
VALUES ($1, $2)
RETURNING id, document_id, content, created_at;



-- name: GetChunks :many

SELECT id, document_id, content, created_at
FROM chunks
WHERE document_id = $1;