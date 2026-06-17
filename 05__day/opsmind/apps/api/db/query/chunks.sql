-- name: CreateChunk :one


INSERT INTO chunks
(
document_id,
content
)

VALUES
(
$1,
$2
)

RETURNING *;



-- name: GetChunks :many


SELECT *

FROM chunks

WHERE document_id=$1;
