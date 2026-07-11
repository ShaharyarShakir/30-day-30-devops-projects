package enrollment

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/platform/services/course/internal/database"
	"github.com/platform/services/course/internal/event"
)

var (
	ErrAlreadyEnrolled = errors.New("student is already enrolled in this course")
	ErrCourseNotFound  = errors.New("course not found")
	ErrCourseNotPub    = errors.New("cannot enroll in a non-published course")
)

type Service struct {
	repo      Repository
	dbQueries *database.Queries
	publisher event.Publisher
}

func NewService(repo Repository, dbQueries *database.Queries, publisher event.Publisher) *Service {
	return &Service{
		repo:      repo,
		dbQueries: dbQueries,
		publisher: publisher,
	}
}

func (s *Service) Enroll(ctx context.Context, courseID uuid.UUID, userID uuid.UUID) (*Enrollment, error) {
	// Verify course exists
	dbCourse, err := s.dbQueries.GetCourseByID(ctx, database.UUIDToPg(courseID))
	if err != nil {
		return nil, ErrCourseNotFound
	}

	// Cannot enroll in non-published courses
	if dbCourse.Status != "PUBLISHED" {
		return nil, ErrCourseNotPub
	}

	// Check if already enrolled
	existing, err := s.repo.Get(ctx, courseID, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrAlreadyEnrolled
	}

	enrollmentID := uuid.New()
	enr, err := s.repo.Enroll(ctx, enrollmentID, courseID, userID)
	if err != nil {
		return nil, err
	}

	return enr, nil
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]*Enrollment, error) {
	return s.repo.ListByUserID(ctx, userID)
}

func (s *Service) CheckEnrollment(ctx context.Context, courseID uuid.UUID, userID uuid.UUID) (bool, error) {
	enr, err := s.repo.Get(ctx, courseID, userID)
	if err != nil {
		return false, err
	}
	return enr != nil, nil
}
