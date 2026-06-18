-- name: SearchChunks :many

SELECT 
    id,
    document_id,
    content
FROM chunks
ORDER BY embedding <=> $1
LIMIT $2;