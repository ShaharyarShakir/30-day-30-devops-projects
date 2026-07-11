package section

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/platform/services/course/internal/database"
	"github.com/platform/services/course/internal/event"
)

type Repository interface {
	Create(ctx context.Context, sec *Section) (*Section, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Section, error)
	ListByCourseID(ctx context.Context, courseID uuid.UUID) ([]*Section, error)
	Update(ctx context.Context, sec *Section) (*Section, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type PostgresRepository struct {
	pool    *pgxpool.Pool
	queries *database.Queries
}

func NewPostgresRepository(pool *pgxpool.Pool, queries *database.Queries) *PostgresRepository {
	return &PostgresRepository{
		pool:    pool,
		queries: queries,
	}
}

func mapToDomain(s database.Section) *Section {
	return &Section{
		ID:       database.PgToUUID(s.ID),
		CourseID: database.PgToUUID(s.CourseID),
		Title:    s.Title,
		Position: int(s.Position),
	}
}

func (r *PostgresRepository) Create(ctx context.Context, sec *Section) (*Section, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	params := database.CreateSectionParams{
		ID:       database.UUIDToPg(sec.ID),
		CourseID: database.UUIDToPg(sec.CourseID),
		Title:    sec.Title,
		Position: int32(sec.Position),
	}

	dbSec, err := qtx.CreateSection(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create section: %w", err)
	}

	// Queue course.section.created outbox event in same transaction
	err = event.QueueOutboxEvent(ctx, qtx, database.PgToUUID(dbSec.ID), "course", "course.section.created", map[string]interface{}{
		"id":        database.PgToUUID(dbSec.ID),
		"course_id": database.PgToUUID(dbSec.CourseID),
		"title":     dbSec.Title,
		"position":  dbSec.Position,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to queue section outbox event: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return mapToDomain(dbSec), nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*Section, error) {
	dbSec, err := r.queries.GetSectionByID(ctx, database.UUIDToPg(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("section not found")
		}
		return nil, err
	}
	return mapToDomain(dbSec), nil
}

func (r *PostgresRepository) ListByCourseID(ctx context.Context, courseID uuid.UUID) ([]*Section, error) {
	dbSecs, err := r.queries.ListSectionsByCourseID(ctx, database.UUIDToPg(courseID))
	if err != nil {
		return nil, err
	}

	res := make([]*Section, len(dbSecs))
	for i, s := range dbSecs {
		res[i] = mapToDomain(s)
	}
	return res, nil
}

func (r *PostgresRepository) Update(ctx context.Context, sec *Section) (*Section, error) {
	params := database.UpdateSectionParams{
		ID:       database.UUIDToPg(sec.ID),
		Title:    sec.Title,
		Position: int32(sec.Position),
	}

	dbSec, err := r.queries.UpdateSection(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to update section: %w", err)
	}

	return mapToDomain(dbSec), nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteSection(ctx, database.UUIDToPg(id))
}
