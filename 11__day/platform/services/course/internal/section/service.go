package section

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/platform/services/course/internal/database"
)

var (
	ErrUnauthorized   = errors.New("unauthorized operation")
	ErrCourseNotFound = errors.New("course not found")
	ErrCannotEdit     = errors.New("only courses in DRAFT status can be edited")
)

type Service struct {
	repo      Repository
	dbQueries *database.Queries
}

func NewService(repo Repository, dbQueries *database.Queries) *Service {
	return &Service{
		repo:      repo,
		dbQueries: dbQueries,
	}
}

func (s *Service) Create(ctx context.Context, courseID uuid.UUID, userID uuid.UUID, isAdmin bool, req CreateSectionRequest) (*Section, error) {
	// Verify course exists
	dbCourse, err := s.dbQueries.GetCourseByID(ctx, database.UUIDToPg(courseID))
	if err != nil {
		return nil, ErrCourseNotFound
	}

	// Verify user is owner or admin
	ownerID := database.PgToUUID(dbCourse.OwnerID)
	if ownerID != userID && !isAdmin {
		return nil, ErrUnauthorized
	}

	// Only DRAFT courses can be edited
	if dbCourse.Status != "DRAFT" && !isAdmin {
		return nil, ErrCannotEdit
	}

	sec := &Section{
		ID:       uuid.New(),
		CourseID: courseID,
		Title:    req.Title,
		Position: req.Position,
	}

	return s.repo.Create(ctx, sec)
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, isAdmin bool, req CreateSectionRequest) (*Section, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	dbCourse, err := s.dbQueries.GetCourseByID(ctx, database.UUIDToPg(existing.CourseID))
	if err != nil {
		return nil, ErrCourseNotFound
	}

	ownerID := database.PgToUUID(dbCourse.OwnerID)
	if ownerID != userID && !isAdmin {
		return nil, ErrUnauthorized
	}

	if dbCourse.Status != "DRAFT" && !isAdmin {
		return nil, ErrCannotEdit
	}

	existing.Title = req.Title
	existing.Position = req.Position

	return s.repo.Update(ctx, existing)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID, isAdmin bool) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	dbCourse, err := s.dbQueries.GetCourseByID(ctx, database.UUIDToPg(existing.CourseID))
	if err != nil {
		return ErrCourseNotFound
	}

	ownerID := database.PgToUUID(dbCourse.OwnerID)
	if ownerID != userID && !isAdmin {
		return ErrUnauthorized
	}

	if dbCourse.Status != "DRAFT" && !isAdmin {
		return ErrCannotEdit
	}

	return s.repo.Delete(ctx, id)
}
