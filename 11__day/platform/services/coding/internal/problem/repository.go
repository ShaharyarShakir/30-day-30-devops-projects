package problem

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/platform/services/coding/internal/database"
)

type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Problem, error)
	GetBySlug(ctx context.Context, slug string) (*Problem, error)
	List(ctx context.Context) ([]*Problem, error)
	Create(ctx context.Context, req CreateProblemRequest) (*Problem, error)
	Update(ctx context.Context, id uuid.UUID, req UpdateProblemRequest) (*Problem, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetLanguages(ctx context.Context, problemID uuid.UUID) ([]*ProblemLanguage, error)
	GetTestCases(ctx context.Context, problemID uuid.UUID) ([]*TestCase, error)
}

type PostgresRepository struct {
	db *pgxpool.Pool
	q  *database.Queries
}

func NewPostgresRepository(db *pgxpool.Pool, q *database.Queries) Repository {
	return &PostgresRepository{db: db, q: q}
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*Problem, error) {
	dbProblem, err := r.q.GetProblemByID(ctx, database.UUIDToPg(id))
	if err != nil {
		return nil, err
	}
	return dbToProblem(dbProblem), nil
}

func (r *PostgresRepository) GetBySlug(ctx context.Context, slug string) (*Problem, error) {
	dbProblem, err := r.q.GetProblemBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return dbToProblem(dbProblem), nil
}

func (r *PostgresRepository) List(ctx context.Context) ([]*Problem, error) {
	dbProblems, err := r.q.ListProblems(ctx)
	if err != nil {
		return nil, err
	}
	problems := make([]*Problem, len(dbProblems))
	for i, p := range dbProblems {
		problems[i] = dbToProblem(p)
	}
	return problems, nil
}

func (r *PostgresRepository) Create(ctx context.Context, req CreateProblemRequest) (*Problem, error) {
	timeLimit := 2000
	if req.TimeLimitMs != nil {
		timeLimit = *req.TimeLimitMs
	}
	memoryLimit := 256
	if req.MemoryLimitMb != nil {
		memoryLimit = *req.MemoryLimitMb
	}
	dbProblem, err := r.q.CreateProblem(ctx, database.CreateProblemParams{
		Title:         req.Title,
		Slug:          req.Slug,
		Difficulty:    req.Difficulty,
		Statement:     req.Statement,
		Constraints:   database.StringPtrToPg(req.Constraints),
		TimeLimitMs:   int32(timeLimit),
		MemoryLimitMb: int32(memoryLimit),
	})
	if err != nil {
		return nil, err
	}
	return dbToProblem(dbProblem), nil
}

func (r *PostgresRepository) Update(ctx context.Context, id uuid.UUID, req UpdateProblemRequest) (*Problem, error) {
	timeLimit := 2000
	if req.TimeLimitMs != nil {
		timeLimit = *req.TimeLimitMs
	}
	memoryLimit := 256
	if req.MemoryLimitMb != nil {
		memoryLimit = *req.MemoryLimitMb
	}
	dbProblem, err := r.q.UpdateProblem(ctx, database.UpdateProblemParams{
		ID:            database.UUIDToPg(id),
		Title:         req.Title,
		Difficulty:    req.Difficulty,
		Statement:     req.Statement,
		Constraints:   database.StringPtrToPg(req.Constraints),
		TimeLimitMs:   int32(timeLimit),
		MemoryLimitMb: int32(memoryLimit),
	})
	if err != nil {
		return nil, err
	}
	return dbToProblem(dbProblem), nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteProblem(ctx, database.UUIDToPg(id))
}

func (r *PostgresRepository) GetLanguages(ctx context.Context, problemID uuid.UUID) ([]*ProblemLanguage, error) {
	dbLangs, err := r.q.GetProblemLanguages(ctx, database.UUIDToPg(problemID))
	if err != nil {
		return nil, err
	}
	langs := make([]*ProblemLanguage, len(dbLangs))
	for i, l := range dbLangs {
		langs[i] = &ProblemLanguage{
			ProblemID:   database.PgToUUID(l.ProblemID),
			Language:    l.Language,
			StarterCode: database.PgToStringPtr(l.StarterCode),
		}
	}
	return langs, nil
}

func (r *PostgresRepository) GetTestCases(ctx context.Context, problemID uuid.UUID) ([]*TestCase, error) {
	dbCases, err := r.q.GetTestCasesByProblemID(ctx, database.UUIDToPg(problemID))
	if err != nil {
		return nil, err
	}
	cases := make([]*TestCase, len(dbCases))
	for i, tc := range dbCases {
		cases[i] = &TestCase{
			ID:             database.PgToUUID(tc.ID),
			ProblemID:      database.PgToUUID(tc.ProblemID),
			Input:          database.PgToStringPtr(tc.Input),
			ExpectedOutput: database.PgToStringPtr(tc.ExpectedOutput),
			Hidden:         tc.Hidden,
			Weight:         int(tc.Weight),
			CreatedAt:      database.PgToTime(tc.CreatedAt),
		}
	}
	return cases, nil
}

func dbToProblem(p database.CodingProblem) *Problem {
	return &Problem{
		ID:            database.PgToUUID(p.ID),
		Title:         p.Title,
		Slug:          p.Slug,
		Difficulty:    p.Difficulty,
		Statement:     p.Statement,
		Constraints:   database.PgToStringPtr(p.Constraints),
		TimeLimitMs:   int(p.TimeLimitMs),
		MemoryLimitMb: int(p.MemoryLimitMb),
		CreatedAt:     database.PgToTime(p.CreatedAt),
	}
}
