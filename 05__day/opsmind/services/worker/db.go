package main

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5"
)

func connectDB() *pgx.Conn {

	conn, err := pgx.Connect(
		context.Background(),
		"postgres://opsmind:password@localhost:5432/knowledge",
	)

	if err != nil {
		log.Fatal(err)
	}

	return conn
}
