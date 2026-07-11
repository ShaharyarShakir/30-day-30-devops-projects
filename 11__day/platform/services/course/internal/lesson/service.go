package lesson

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/platform/services/course/internal/database"
)

var (
	ErrUnauthorized    = errors.New("unauthorized operation")
	ErrSectionNotFound = errors.New("section not found")
	ErrCourseNotFound  = errors.New("course not found")
	ErrCannotEdit      = errors.New("only courses in DRAFT status can be edited")
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

func (s *Service) Create(ctx context.Context, sectionID uuid.UUID, userID uuid.UUID, isAdmin bool, req CreateLessonRequest) (*Lesson, error) {
	// Verify section exists
	dbSec, err := s.dbQueries.GetSectionByID(ctx, database.UUIDToPg(sectionID))
	if err != nil {
		return nil, ErrSectionNotFound
	}

	// Verify parent course exists
	dbCourse, err := s.dbQueries.GetCourseByID(ctx, dbSec.CourseID)
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

	l := &Lesson{
		ID:        uuid.New(),
		SectionID: sectionID,
		Title:     req.Title,
		Type:      req.Type,
		Duration:  req.Duration,
		Position:  req.Position,
	}

	return s.repo.Create(ctx, l)
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, isAdmin bool, req CreateLessonRequest) (*Lesson, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	dbSec, err := s.dbQueries.GetSectionByID(ctx, database.UUIDToPg(existing.SectionID))
	if err != nil {
		return nil, ErrSectionNotFound
	}

	dbCourse, err := s.dbQueries.GetCourseByID(ctx, dbSec.CourseID)
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
	existing.Type = req.Type
	existing.Duration = req.Duration
	existing.Position = req.Position

	return s.repo.Update(ctx, existing)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID, isAdmin bool) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	dbSec, err := s.dbQueries.GetSectionByID(ctx, database.UUIDToPg(existing.SectionID))
	if err != nil {
		return ErrSectionNotFound
	}

	dbCourse, err := s.dbQueries.GetCourseByID(ctx, dbSec.CourseID)
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
