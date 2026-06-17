-- name: CreateDocument :one

INSERT INTO documents
(
title,
filename,
content_type
)

VALUES
(
$1,
$2,
$3
)

RETURNING *;



-- name: GetDocuments :many

SELECT *

FROM documents

ORDER BY created_at DESC;



-- name: GetDocument :one

SELECT *

FROM documents

WHERE id=$1;
