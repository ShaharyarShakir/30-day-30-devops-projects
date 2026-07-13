package session

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/platform/services/live-session/internal/database"
)

type Repository interface {
	Create(ctx context.Context, s *LiveSession) (*LiveSession, error)
	GetByID(ctx context.Context, id uuid.UUID) (*LiveSession, error)
	ListByCourse(ctx context.Context, courseID uuid.UUID) ([]*LiveSession, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, startedAt, endedAt *time.Time) (*LiveSession, error)
	UpdateDetails(ctx context.Context, id uuid.UUID, title string, description *string, scheduledAt *time.Time) (*LiveSession, error)
	Delete(ctx context.Context, id uuid.UUID) error

	CreateParticipant(ctx context.Context, p *Participant) (*Participant, error)
	GetParticipant(ctx context.Context, sessionID, userID uuid.UUID) (*Participant, error)
	UpdateParticipantLeft(ctx context.Context, sessionID, userID uuid.UUID, leftAt time.Time) (*Participant, error)

	UpsertAttendance(ctx context.Context, sessionID, userID uuid.UUID, duration int) (*Attendance, error)
	GetAttendance(ctx context.Context, sessionID, userID uuid.UUID) (*Attendance, error)
	ListAttendanceBySession(ctx context.Context, sessionID uuid.UUID) ([]*Attendance, error)

	WithTx(ctx context.Context, fn func(*database.Queries) error) error
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

func (r *PostgresRepository) WithTx(ctx context.Context, fn func(*database.Queries) error) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)
	if err := fn(qtx); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) Create(ctx context.Context, s *LiveSession) (*LiveSession, error) {
	dbSession, err := r.queries.CreateLiveSession(ctx, database.CreateLiveSessionParams{
		ID:           database.UUIDToPg(s.ID),
		CourseID:     database.UUIDToPg(s.CourseID),
		InstructorID: database.UUIDToPg(s.InstructorID),
		Title:        s.Title,
		Description:  database.StringPtrToPg(s.Description),
		ScheduledAt:  database.TimePtrToPg(s.ScheduledAt),
		StartedAt:    database.TimePtrToPg(s.StartedAt),
		EndedAt:      database.TimePtrToPg(s.EndedAt),
		Status:       s.Status,
		CreatedAt:    database.TimeToPg(s.CreatedAt),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create live session: %w", err)
	}
	return toLiveSession(dbSession), nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*LiveSession, error) {
	dbSession, err := r.queries.GetLiveSessionByID(ctx, database.UUIDToPg(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get live session: %w", err)
	}
	return toLiveSession(dbSession), nil
}

func (r *PostgresRepository) ListByCourse(ctx context.Context, courseID uuid.UUID) ([]*LiveSession, error) {
	dbSessions, err := r.queries.ListLiveSessionsByCourse(ctx, database.UUIDToPg(courseID))
	if err != nil {
		return nil, fmt.Errorf("failed to list live sessions: %w", err)
	}
	res := make([]*LiveSession, len(dbSessions))
	for i, dbSession := range dbSessions {
		res[i] = toLiveSession(dbSession)
	}
	return res, nil
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, startedAt, endedAt *time.Time) (*LiveSession, error) {
	dbSession, err := r.queries.UpdateLiveSessionStatus(ctx, database.UpdateLiveSessionStatusParams{
		ID:        database.UUIDToPg(id),
		Status:    status,
		StartedAt: database.TimePtrToPg(startedAt),
		EndedAt:   database.TimePtrToPg(endedAt),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update status: %w", err)
	}
	return toLiveSession(dbSession), nil
}

func (r *PostgresRepository) UpdateDetails(ctx context.Context, id uuid.UUID, title string, description *string, scheduledAt *time.Time) (*LiveSession, error) {
	dbSession, err := r.queries.UpdateLiveSessionDetails(ctx, database.UpdateLiveSessionDetailsParams{
		ID:          database.UUIDToPg(id),
		Title:       title,
		Description: database.StringPtrToPg(description),
		ScheduledAt: database.TimePtrToPg(scheduledAt),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update details: %w", err)
	}
	return toLiveSession(dbSession), nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	err := r.queries.DeleteLiveSession(ctx, database.UUIDToPg(id))
	if err != nil {
		return fmt.Errorf("failed to delete live session: %w", err)
	}
	return nil
}

func (r *PostgresRepository) CreateParticipant(ctx context.Context, p *Participant) (*Participant, error) {
	dbPart, err := r.queries.CreateParticipant(ctx, database.CreateParticipantParams{
		ID:        database.UUIDToPg(p.ID),
		SessionID: database.UUIDToPg(p.SessionID),
		UserID:    database.UUIDToPg(p.UserID),
		Role:      p.Role,
		JoinedAt:  database.TimePtrToPg(p.JoinedAt),
		LeftAt:    database.TimePtrToPg(p.LeftAt),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create participant: %w", err)
	}
	return toParticipant(dbPart), nil
}

func (r *PostgresRepository) GetParticipant(ctx context.Context, sessionID, userID uuid.UUID) (*Participant, error) {
	dbPart, err := r.queries.GetParticipant(ctx, database.GetParticipantParams{
		SessionID: database.UUIDToPg(sessionID),
		UserID:    database.UUIDToPg(userID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get participant: %w", err)
	}
	return toParticipant(dbPart), nil
}

func (r *PostgresRepository) UpdateParticipantLeft(ctx context.Context, sessionID, userID uuid.UUID, leftAt time.Time) (*Participant, error) {
	dbPart, err := r.queries.UpdateParticipantLeft(ctx, database.UpdateParticipantLeftParams{
		SessionID: database.UUIDToPg(sessionID),
		UserID:    database.UUIDToPg(userID),
		LeftAt:    database.TimeToPg(leftAt),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update participant left: %w", err)
	}
	return toParticipant(dbPart), nil
}

func (r *PostgresRepository) UpsertAttendance(ctx context.Context, sessionID, userID uuid.UUID, duration int) (*Attendance, error) {
	attendanceID := uuid.New()
	dbAtt, err := r.queries.UpsertAttendance(ctx, database.UpsertAttendanceParams{
		ID:        database.UUIDToPg(attendanceID),
		SessionID: database.UUIDToPg(sessionID),
		UserID:    database.UUIDToPg(userID),
		Duration:  int32(duration),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upsert attendance: %w", err)
	}
	return toAttendance(dbAtt), nil
}

func (r *PostgresRepository) GetAttendance(ctx context.Context, sessionID, userID uuid.UUID) (*Attendance, error) {
	dbAtt, err := r.queries.GetAttendance(ctx, database.GetAttendanceParams{
		SessionID: database.UUIDToPg(sessionID),
		UserID:    database.UUIDToPg(userID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get attendance: %w", err)
	}
	return toAttendance(dbAtt), nil
}

func (r *PostgresRepository) ListAttendanceBySession(ctx context.Context, sessionID uuid.UUID) ([]*Attendance, error) {
	dbAtts, err := r.queries.ListAttendanceBySession(ctx, database.UUIDToPg(sessionID))
	if err != nil {
		return nil, fmt.Errorf("failed to list attendance: %w", err)
	}
	res := make([]*Attendance, len(dbAtts))
	for i, dbAtt := range dbAtts {
		res[i] = toAttendance(dbAtt)
	}
	return res, nil
}

// Map database structs to domain models
func toLiveSession(d database.LiveSession) *LiveSession {
	return &LiveSession{
		ID:           database.PgToUUID(d.ID),
		CourseID:     database.PgToUUID(d.CourseID),
		InstructorID: database.PgToUUID(d.InstructorID),
		Title:        d.Title,
		Description:  database.PgToStringPtr(d.Description),
		ScheduledAt:  database.PgToTimePtr(d.ScheduledAt),
		StartedAt:    database.PgToTimePtr(d.StartedAt),
		EndedAt:      database.PgToTimePtr(d.EndedAt),
		Status:       d.Status,
		CreatedAt:    database.PgToTime(d.CreatedAt),
	}
}

func toParticipant(d database.Participant) *Participant {
	return &Participant{
		ID:        database.PgToUUID(d.ID),
		SessionID: database.PgToUUID(d.SessionID),
		UserID:    database.PgToUUID(d.UserID),
		Role:      d.Role,
		JoinedAt:  database.PgToTimePtr(d.JoinedAt),
		LeftAt:    database.PgToTimePtr(d.LeftAt),
	}
}

func toAttendance(d database.Attendance) *Attendance {
	return &Attendance{
		ID:        database.PgToUUID(d.ID),
		SessionID: database.PgToUUID(d.SessionID),
		UserID:    database.PgToUUID(d.UserID),
		Duration:  int(d.Duration),
	}
}
