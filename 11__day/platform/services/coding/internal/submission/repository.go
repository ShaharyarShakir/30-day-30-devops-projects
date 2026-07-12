package submission

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/platform/services/coding/internal/database"
)

type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Submission, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*Submission, error)
	ListByUserWithFilters(ctx context.Context, userID uuid.UUID, problemID *uuid.UUID, language, status, limit, offset string) ([]*Submission, error)
	ListByProblem(ctx context.Context, problemID uuid.UUID) ([]*Submission, error)
	Create(ctx context.Context, userID uuid.UUID, req CreateSubmissionRequest) (*Submission, error)
	Update(ctx context.Context, id uuid.UUID, status string, score *int, runtime *int64, memory *int64) (*Submission, error)
	GetResults(ctx context.Context, submissionID uuid.UUID) ([]*SubmissionResult, error)
}

type PostgresRepository struct {
	db *pgxpool.Pool
	q  *database.Queries
}

func NewPostgresRepository(db *pgxpool.Pool, q *database.Queries) Repository {
	return &PostgresRepository{db: db, q: q}
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*Submission, error) {
	dbSub, err := r.q.GetSubmissionByID(ctx, database.UUIDToPg(id))
	if err != nil {
		return nil, err
	}
	return dbToSubmission(dbSub), nil
}

func (r *PostgresRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]*Submission, error) {
	dbSubs, err := r.q.ListSubmissionsByUser(ctx, database.UUIDToPg(userID))
	if err != nil {
		return nil, err
	}
	subs := make([]*Submission, len(dbSubs))
	for i, s := range dbSubs {
		subs[i] = dbToSubmission(s)
	}
	return subs, nil
}

func (r *PostgresRepository) ListByUserWithFilters(ctx context.Context, userID uuid.UUID, problemID *uuid.UUID, language, status, limit, offset string) ([]*Submission, error) {
	query := `
		SELECT id, user_id, problem_id, language, status, score, runtime, memory, code, created_at
		FROM submissions
		WHERE user_id = $1
	`
	args := []interface{}{database.UUIDToPg(userID)}
	argCount := 1

	if problemID != nil {
		argCount++
		query += fmt.Sprintf(" AND problem_id = $%d", argCount)
		args = append(args, database.UUIDToPg(*problemID))
	}

	if language != "" {
		argCount++
		query += fmt.Sprintf(" AND language = $%d", argCount)
		args = append(args, language)
	}

	if status != "" {
		argCount++
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, status)
	}

	query += " ORDER BY created_at DESC"

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

	var subs []*Submission
	for rows.Next() {
		var s database.Submission
		err := rows.Scan(
			&s.ID, &s.UserID, &s.ProblemID, &s.Language, &s.Status,
			&s.Score, &s.Runtime, &s.Memory, &s.Code, &s.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		subs = append(subs, dbToSubmission(s))
	}

	return subs, nil
}

func (r *PostgresRepository) ListByProblem(ctx context.Context, problemID uuid.UUID) ([]*Submission, error) {
	dbSubs, err := r.q.ListSubmissionsByProblem(ctx, database.UUIDToPg(problemID))
	if err != nil {
		return nil, err
	}
	subs := make([]*Submission, len(dbSubs))
	for i, s := range dbSubs {
		subs[i] = dbToSubmission(s)
	}
	return subs, nil
}

func (r *PostgresRepository) Create(ctx context.Context, userID uuid.UUID, req CreateSubmissionRequest) (*Submission, error) {
	problemID, err := uuid.Parse(req.ProblemID)
	if err != nil {
		return nil, err
	}
	dbSub, err := r.q.CreateSubmission(ctx, database.CreateSubmissionParams{
		UserID:    database.UUIDToPg(userID),
		ProblemID: database.UUIDToPg(problemID),
		Language:  req.Language,
		Code:      req.Code,
	})
	if err != nil {
		return nil, err
	}
	return dbToSubmission(dbSub), nil
}

func (r *PostgresRepository) Update(ctx context.Context, id uuid.UUID, status string, score *int, runtime *int64, memory *int64) (*Submission, error) {
	dbSub, err := r.q.UpdateSubmission(ctx, database.UpdateSubmissionParams{
		ID:      database.UUIDToPg(id),
		Status:  status,
		Score:   pgIntFromPtr(score),
		Runtime: pgInt8FromPtr(runtime),
		Memory:  pgInt8FromPtr(memory),
	})
	if err != nil {
		return nil, err
	}
	return dbToSubmission(dbSub), nil
}

func dbToSubmission(s database.Submission) *Submission {
	return &Submission{
		ID:        database.PgToUUID(s.ID),
		UserID:    database.PgToUUID(s.UserID),
		ProblemID: database.PgToUUID(s.ProblemID),
		Language:  s.Language,
		Status:    s.Status,
		Score:     ptrFromPgInt(s.Score),
		Runtime:   ptrFromPgInt8(s.Runtime),
		Memory:    ptrFromPgInt8(s.Memory),
		Code:      s.Code,
		CreatedAt: database.PgToTime(s.CreatedAt),
	}
}

func pgIntFromPtr(i *int) pgtype.Int4 {
	if i == nil {
		return pgtype.Int4{Valid: false}
	}
	return pgtype.Int4{Int32: int32(*i), Valid: true}
}

func pgInt8FromPtr(i *int64) pgtype.Int8 {
	if i == nil {
		return pgtype.Int8{Valid: false}
	}
	return pgtype.Int8{Int64: *i, Valid: true}
}

func ptrFromPgInt(i pgtype.Int4) *int {
	if !i.Valid {
		return nil
	}
	val := int(i.Int32)
	return &val
}

func ptrFromPgInt8(i pgtype.Int8) *int64 {
	if !i.Valid {
		return nil
	}
	return &i.Int64
}

func (r *PostgresRepository) GetResults(ctx context.Context, submissionID uuid.UUID) ([]*SubmissionResult, error) {
	dbResults, err := r.q.GetSubmissionResults(ctx, database.UUIDToPg(submissionID))
	if err != nil {
		return nil, err
	}
	results := make([]*SubmissionResult, len(dbResults))
	for i, res := range dbResults {
		results[i] = &SubmissionResult{
			SubmissionID: database.PgToUUID(res.SubmissionID),
			TestCaseID:   database.PgToUUID(res.TestCaseID),
			Runtime:      ptrFromPgInt8(res.Runtime),
			Memory:       ptrFromPgInt8(res.Memory),
			Status:       res.Status,
			Stdout:       database.PgToStringPtr(res.Stdout),
			Stderr:       database.PgToStringPtr(res.Stderr),
			CreatedAt:    database.PgToTime(res.CreatedAt),
		}
	}
	return results, nil
}
