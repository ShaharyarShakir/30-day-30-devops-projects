package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/platform/services/course/migrations"
	"github.com/pressly/goose/v3"
)

// RunMigrations runs goose migrations against the database.
func RunMigrations(connString string) error {
	db, err := sql.Open("pgx", connString)
	if err != nil {
		return fmt.Errorf("failed to open sql db for migrations: %w", err)
	}
	defer db.Close()

	goose.SetBaseFS(migrations.EmbedFS)

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("failed to set dialect: %w", err)
	}

	// Since EmbedFS is in the migrations package, the migrations are in the root of the embedded filesystem
	if err := goose.Up(db, "."); err != nil {
		return fmt.Errorf("failed to execute goose migrations: %w", err)
	}

	return nil
}

// Connect initializes the pgx connection pool.
func Connect(ctx context.Context, connString string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse connection string: %w", err)
	}

	// Set connection pool parameters
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 15 * time.Minute

	// Connect to database with retry
	var pool *pgxpool.Pool
	for i := 0; i < 5; i++ {
		pool, err = pgxpool.NewWithConfig(ctx, config)
		if err == nil {
			// Ping the connection
			if err = pool.Ping(ctx); err == nil {
				return pool, nil
			}
		}
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("failed to connect to database pool after retries: %w", err)
}
