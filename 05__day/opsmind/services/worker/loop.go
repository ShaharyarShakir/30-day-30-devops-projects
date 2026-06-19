package main

import (
	"context"

	"github.com/jackc/pgx/v5"
)

type Chunk struct {
	ID      string
	Content string
}

func fetchChunks(db *pgx.Conn) ([]Chunk, error) {

	rows, err := db.Query(
		context.Background(),
		`

		UPDATE chunks

		SET status='processing'

		WHERE id IN (

			SELECT id

			FROM chunks

			WHERE status='pending'

			LIMIT 10

			FOR UPDATE SKIP LOCKED

		)

		RETURNING id, content

		`,
	)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var chunks []Chunk

	for rows.Next() {

		var c Chunk

		err := rows.Scan(
			&c.ID,
			&c.Content,
		)

		if err != nil {
			return nil, err
		}

		chunks = append(
			chunks,
			c,
		)

	}

	return chunks, nil
}
