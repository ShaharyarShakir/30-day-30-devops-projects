package enrollment

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/platform/services/course/internal/database"
	"github.com/platform/services/course/internal/event"
)

type Repository interface {
	Enroll(ctx context.Context, id uuid.UUID, courseID uuid.UUID, userID uuid.UUID) (*Enrollment, error)
	Get(ctx context.Context, courseID uuid.UUID, userID uuid.UUID) (*Enrollment, error)
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*Enrollment, error)
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

func (r *PostgresRepository) Enroll(ctx context.Context, id uuid.UUID, courseID uuid.UUID, userID uuid.UUID) (*Enrollment, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	params := database.CreateEnrollmentParams{
		ID:         database.UUIDToPg(id),
		CourseID:   database.UUIDToPg(courseID),
		UserID:     database.UUIDToPg(userID),
		EnrolledAt: database.TimeToPg(time.Now()),
	}

	dbEnroll, err := qtx.CreateEnrollment(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to enroll student: %w", err)
	}

	// Write student.enrolled outbox event in same transaction
	err = event.QueueOutboxEvent(ctx, qtx, database.PgToUUID(dbEnroll.ID), "enrollment", "student.enrolled", map[string]interface{}{
		"id":          database.PgToUUID(dbEnroll.ID),
		"course_id":   database.PgToUUID(dbEnroll.CourseID),
		"user_id":     database.PgToUUID(dbEnroll.UserID),
		"enrolled_at": database.PgToTime(dbEnroll.EnrolledAt),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to queue student.enrolled outbox event: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &Enrollment{
		ID:         database.PgToUUID(dbEnroll.ID),
		CourseID:   database.PgToUUID(dbEnroll.CourseID),
		UserID:     database.PgToUUID(dbEnroll.UserID),
		EnrolledAt: database.PgToTime(dbEnroll.EnrolledAt),
	}, nil
}

func (r *PostgresRepository) Get(ctx context.Context, courseID uuid.UUID, userID uuid.UUID) (*Enrollment, error) {
	dbEnroll, err := r.queries.GetEnrollment(ctx, database.GetEnrollmentParams{
		CourseID: database.UUIDToPg(courseID),
		UserID:   database.UUIDToPg(userID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // not enrolled
		}
		return nil, err
	}

	return &Enrollment{
		ID:         database.PgToUUID(dbEnroll.ID),
		CourseID:   database.PgToUUID(dbEnroll.CourseID),
		UserID:     database.PgToUUID(dbEnroll.UserID),
		EnrolledAt: database.PgToTime(dbEnroll.EnrolledAt),
	}, nil
}

func (r *PostgresRepository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*Enrollment, error) {
	dbEnrollments, err := r.queries.ListEnrollmentsByUserID(ctx, database.UUIDToPg(userID))
	if err != nil {
		return nil, err
	}

	res := make([]*Enrollment, len(dbEnrollments))
	for i, e := range dbEnrollments {
		res[i] = &Enrollment{
			ID:                 database.PgToUUID(e.ID),
			CourseID:           database.PgToUUID(e.CourseID),
			UserID:             database.PgToUUID(e.UserID),
			EnrolledAt:         database.PgToTime(e.EnrolledAt),
			CourseTitle:        e.CourseTitle,
			CourseSlug:         e.CourseSlug,
			CourseThumbnailURL: database.PgToStringPtr(e.CourseThumbnailUrl),
		}
	}
	return res, nil
}
