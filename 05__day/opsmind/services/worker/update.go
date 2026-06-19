package main

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/pgvector/pgvector-go"
)

func updateEmbedding(
	db *pgx.Conn,
	id string,
	vec pgvector.Vector,
) error {

	_, err := db.Exec(
		context.Background(),
		`
		UPDATE chunks
		SET embedding = $1
		WHERE id = $2
		`,
		vec,
		id,
	)

	return err
}
