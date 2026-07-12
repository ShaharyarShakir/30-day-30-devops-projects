package leaderboard

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Upsert(ctx context.Context, req LeaderboardRequest) (*LeaderboardEntry, error)
	GetByProblem(ctx context.Context, problemID, limit, offset, orderBy string) ([]*LeaderboardEntry, error)
	GetByUser(ctx context.Context, userID string) ([]*LeaderboardEntry, error)
	GetByProblemAndUser(ctx context.Context, problemID, userID string) (*LeaderboardEntry, error)
}

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Upsert(ctx context.Context, req LeaderboardRequest) (*LeaderboardEntry, error) {
	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		return nil, err
	}

	var problemID *uuid.UUID
	if req.ProblemID != "" {
		puid, err := uuid.Parse(req.ProblemID)
		if err != nil {
			return nil, err
		}
		problemID = &puid
	}

	query := `
		INSERT INTO leaderboards (problem_id, user_id, score, runtime, memory, language, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (problem_id, user_id)
		DO UPDATE SET
			score = EXCLUDED.score,
			runtime = EXCLUDED.runtime,
			memory = EXCLUDED.memory,
			language = EXCLUDED.language,
			updated_at = NOW()
		RETURNING id, problem_id, user_id, score, runtime, memory, language, updated_at
	`

	var entry LeaderboardEntry
	err = r.db.QueryRow(ctx, query, problemID, userID, req.Score, req.Runtime, req.Memory, req.Language).Scan(
		&entry.ID, &entry.ProblemID, &entry.UserID, &entry.Score,
		&entry.Runtime, &entry.Memory, &entry.Language, &entry.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &entry, nil
}

func (r *PostgresRepository) GetByProblem(ctx context.Context, problemID, limit, offset, orderBy string) ([]*LeaderboardEntry, error) {
	query := `
		SELECT id, problem_id, user_id, score, runtime, memory, language, updated_at
		FROM leaderboards
		WHERE problem_id = $1
	`

	args := []interface{}{problemID}
	argCount := 1

	// Set default order by score DESC
	if orderBy == "" {
		orderBy = "score DESC"
	}
	query += fmt.Sprintf(" ORDER BY %s", orderBy)

	if limit != "" {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, limit)
	}

	if offset != "" {
		argCount++
		query += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, offset)
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*LeaderboardEntry
	for rows.Next() {
		var entry LeaderboardEntry
		err := rows.Scan(
			&entry.ID, &entry.ProblemID, &entry.UserID, &entry.Score,
			&entry.Runtime, &entry.Memory, &entry.Language, &entry.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		entries = append(entries, &entry)
	}

	return entries, nil
}

func (r *PostgresRepository) GetByUser(ctx context.Context, userID string) ([]*LeaderboardEntry, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT id, problem_id, user_id, score, runtime, memory, language, updated_at
		FROM leaderboards
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`

	rows, err := r.db.Query(ctx, query, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*LeaderboardEntry
	for rows.Next() {
		var entry LeaderboardEntry
		err := rows.Scan(
			&entry.ID, &entry.ProblemID, &entry.UserID, &entry.Score,
			&entry.Runtime, &entry.Memory, &entry.Language, &entry.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		entries = append(entries, &entry)
	}

	return entries, nil
}

func (r *PostgresRepository) GetByProblemAndUser(ctx context.Context, problemID, userID string) (*LeaderboardEntry, error) {
	puid, err := uuid.Parse(problemID)
	if err != nil {
		return nil, err
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT id, problem_id, user_id, score, runtime, memory, language, updated_at
		FROM leaderboards
		WHERE problem_id = $1 AND user_id = $2
	`

	var entry LeaderboardEntry
	err = r.db.QueryRow(ctx, query, puid, uid).Scan(
		&entry.ID, &entry.ProblemID, &entry.UserID, &entry.Score,
		&entry.Runtime, &entry.Memory, &entry.Language, &entry.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &entry, nil
}
