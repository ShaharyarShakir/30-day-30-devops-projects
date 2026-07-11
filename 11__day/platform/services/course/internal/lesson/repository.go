package lesson

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
	Create(ctx context.Context, l *Lesson) (*Lesson, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Lesson, error)
	ListBySectionID(ctx context.Context, sectionID uuid.UUID) ([]*Lesson, error)
	Update(ctx context.Context, l *Lesson) (*Lesson, error)
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

func mapToDomain(l database.Lesson) *Lesson {
	return &Lesson{
		ID:        database.PgToUUID(l.ID),
		SectionID: database.PgToUUID(l.SectionID),
		Title:     l.Title,
		Type:      l.Type,
		Duration:  database.PgToIntPtr(l.Duration),
		Position:  database.PgToIntPtr(l.Position),
	}
}

func (r *PostgresRepository) Create(ctx context.Context, l *Lesson) (*Lesson, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	params := database.CreateLessonParams{
		ID:        database.UUIDToPg(l.ID),
		SectionID: database.UUIDToPg(l.SectionID),
		Title:     l.Title,
		Type:      l.Type,
		Duration:  database.IntPtrToPg(l.Duration),
		Position:  database.IntPtrToPg(l.Position),
	}

	dbLesson, err := qtx.CreateLesson(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create lesson: %w", err)
	}

	// Queue course.lesson.created event
	err = event.QueueOutboxEvent(ctx, qtx, database.PgToUUID(dbLesson.ID), "course", "course.lesson.created", map[string]interface{}{
		"id":         database.PgToUUID(dbLesson.ID),
		"section_id": database.PgToUUID(dbLesson.SectionID),
		"title":      dbLesson.Title,
		"type":       dbLesson.Type,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to queue lesson created outbox event: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return mapToDomain(dbLesson), nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*Lesson, error) {
	dbLesson, err := r.queries.GetLessonByID(ctx, database.UUIDToPg(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("lesson not found")
		}
		return nil, err
	}
	return mapToDomain(dbLesson), nil
}

func (r *PostgresRepository) ListBySectionID(ctx context.Context, sectionID uuid.UUID) ([]*Lesson, error) {
	dbLessons, err := r.queries.ListLessonsBySectionID(ctx, database.UUIDToPg(sectionID))
	if err != nil {
		return nil, err
	}

	res := make([]*Lesson, len(dbLessons))
	for i, l := range dbLessons {
		res[i] = mapToDomain(l)
	}
	return res, nil
}

func (r *PostgresRepository) Update(ctx context.Context, l *Lesson) (*Lesson, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	params := database.UpdateLessonParams{
		ID:        database.UUIDToPg(l.ID),
		Title:     l.Title,
		Type:      l.Type,
		Duration:  database.IntPtrToPg(l.Duration),
		Position:  database.IntPtrToPg(l.Position),
	}

	dbLesson, err := qtx.UpdateLesson(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to update lesson: %w", err)
	}

	// Queue course.lesson.updated event
	err = event.QueueOutboxEvent(ctx, qtx, database.PgToUUID(dbLesson.ID), "course", "course.lesson.updated", map[string]interface{}{
		"id":         database.PgToUUID(dbLesson.ID),
		"section_id": database.PgToUUID(dbLesson.SectionID),
		"title":      dbLesson.Title,
		"type":       dbLesson.Type,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to queue lesson updated outbox event: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return mapToDomain(dbLesson), nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteLesson(ctx, database.UUIDToPg(id))
}
