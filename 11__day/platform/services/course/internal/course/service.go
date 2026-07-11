package course

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/platform/services/course/internal/database"
	"github.com/platform/services/course/internal/event"
)

var (
	ErrUnauthorized    = errors.New("unauthorized operation")
	ErrCourseNotFound  = errors.New("course not found")
	ErrCannotEdit      = errors.New("only courses in DRAFT status can be edited")
	ErrIncompleteData  = errors.New("course details, sections, and lessons must be complete to publish")
)

type Service struct {
	repo       Repository
	dbQueries  *database.Queries
	publisher  event.Publisher
}

func NewService(repo Repository, dbQueries *database.Queries, publisher event.Publisher) *Service {
	return &Service{
		repo:      repo,
		dbQueries: dbQueries,
		publisher: publisher,
	}
}

func slugify(s string) string {
	s = strings.ToLower(s)
	var sb strings.Builder
	lastDash := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			sb.WriteRune(r)
			lastDash = false
		} else if r == ' ' || r == '-' || r == '_' {
			if !lastDash && sb.Len() > 0 {
				sb.WriteByte('-')
				lastDash = true
			}
		}
	}
	res := sb.String()
	res = strings.TrimSuffix(res, "-")
	return res
}

func (s *Service) Create(ctx context.Context, ownerID uuid.UUID, req CreateCourseRequest) (*Course, error) {
	slug := slugify(req.Title)
	if slug == "" {
		slug = uuid.New().String()
	}

	// Ensure uniqueness of slug or add a unique suffix if needed, but for simplicity, slugify + random uuid suffix if duplicate.
	// We can check if slug exists:
	existing, err := s.repo.GetBySlug(ctx, slug)
	if err == nil && existing != nil {
		slug = fmt.Sprintf("%s-%s", slug, uuid.New().String()[:8])
	}

	var catUUIDs []uuid.UUID
	for _, cid := range req.CategoryIDs {
		uid, err := uuid.Parse(cid)
		if err == nil {
			catUUIDs = append(catUUIDs, uid)
		}
	}

	c := &Course{
		ID:           uuid.New(),
		OwnerID:      ownerID,
		Title:        req.Title,
		Slug:         slug,
		Subtitle:     req.Subtitle,
		Description:  req.Description,
		Level:        req.Level,
		Language:     req.Language,
		Price:        req.Price,
		ThumbnailURL: req.ThumbnailURL,
		Status:       "DRAFT",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	created, err := s.repo.Create(ctx, c, catUUIDs)
	if err != nil {
		return nil, err
	}

	return created, nil
}

func (s *Service) Update(ctx context.Context, courseID uuid.UUID, userID uuid.UUID, isAdmin bool, req UpdateCourseRequest) (*Course, error) {
	existing, err := s.repo.GetByID(ctx, courseID)
	if err != nil {
		return nil, ErrCourseNotFound
	}

	if existing.OwnerID != userID && !isAdmin {
		return nil, ErrUnauthorized
	}

	// Business rule: Only DRAFT courses can be edited freely.
	if existing.Status != "DRAFT" && !isAdmin {
		return nil, ErrCannotEdit
	}

	var catUUIDs []uuid.UUID
	for _, cid := range req.CategoryIDs {
		uid, err := uuid.Parse(cid)
		if err == nil {
			catUUIDs = append(catUUIDs, uid)
		}
	}

	existing.Title = req.Title
	existing.Slug = req.Slug
	existing.Subtitle = req.Subtitle
	existing.Description = req.Description
	existing.Level = req.Level
	existing.Language = req.Language
	existing.Price = req.Price
	existing.ThumbnailURL = req.ThumbnailURL
	existing.Status = req.Status
	existing.UpdatedAt = time.Now()

	updated, err := s.repo.Update(ctx, existing, catUUIDs)
	if err != nil {
		return nil, err
	}

	return updated, nil
}

func (s *Service) Delete(ctx context.Context, courseID uuid.UUID, userID uuid.UUID, isAdmin bool) error {
	existing, err := s.repo.GetByID(ctx, courseID)
	if err != nil {
		return ErrCourseNotFound
	}

	if existing.OwnerID != userID && !isAdmin {
		return ErrUnauthorized
	}

	err = s.repo.Delete(ctx, courseID)
	if err != nil {
		return err
	}

	return nil
}

func (s *Service) Get(ctx context.Context, identifier string, userID uuid.UUID, isAdmin bool) (*Course, error) {
	var c *Course
	var err error

	courseID, err := uuid.Parse(identifier)
	if err == nil {
		c, err = s.repo.GetByID(ctx, courseID)
	} else {
		c, err = s.repo.GetBySlug(ctx, identifier)
	}

	if err != nil {
		return nil, ErrCourseNotFound
	}

	// If course is not published, only owner or admin can view it
	if c.Status != "PUBLISHED" && c.OwnerID != userID && !isAdmin {
		return nil, ErrUnauthorized
	}

	return c, nil
}

func (s *Service) List(ctx context.Context, userID uuid.UUID, isAdmin bool, roleInstructor bool) ([]*Course, error) {
	// If instructor, list their own courses (drafts, etc.)
	// If admin, list all courses
	// Otherwise, list only published courses
	if isAdmin {
		return s.repo.List(ctx, "", uuid.Nil)
	} else if roleInstructor && userID != uuid.Nil {
		return s.repo.List(ctx, "", userID)
	}
	return s.repo.List(ctx, "PUBLISHED", uuid.Nil)
}

func (s *Service) Publish(ctx context.Context, courseID uuid.UUID, userID uuid.UUID, isAdmin bool) (*Course, *ValidationResponse, error) {
	existing, err := s.repo.GetByID(ctx, courseID)
	if err != nil {
		return nil, nil, ErrCourseNotFound
	}

	if existing.OwnerID != userID && !isAdmin {
		return nil, nil, ErrUnauthorized
	}

	// Run publish validation
	vResp, err := s.ValidatePublish(ctx, courseID)
	if err != nil {
		return nil, nil, err
	}

	if !vResp.Valid {
		return nil, vResp, nil
	}

	catIDs := make([]uuid.UUID, len(existing.Categories))
	for i, cat := range existing.Categories {
		catIDs[i] = cat.ID
	}

	existing.Status = "PUBLISHED"
	existing.UpdatedAt = time.Now()

	// Update course status and categories in DB (triggers course.published event in repository transaction)
	updated, err := s.repo.Update(ctx, existing, catIDs)
	if err != nil {
		return nil, nil, err
	}

	return updated, vResp, nil
}

func (s *Service) ValidatePublish(ctx context.Context, courseID uuid.UUID) (*ValidationResponse, error) {
	existing, err := s.repo.GetByID(ctx, courseID)
	if err != nil {
		return nil, ErrCourseNotFound
	}

	var validationErrors []ValidationError

	if existing.Title == "" {
		validationErrors = append(validationErrors, ValidationError{Field: "title", Message: "Title is required."})
	}
	if existing.Subtitle == nil || *existing.Subtitle == "" {
		validationErrors = append(validationErrors, ValidationError{Field: "subtitle", Message: "Subtitle is required."})
	}
	if existing.Description == nil || len(*existing.Description) < 10 {
		validationErrors = append(validationErrors, ValidationError{Field: "description", Message: "Description must be at least 10 characters."})
	}
	if existing.ThumbnailURL == nil || *existing.ThumbnailURL == "" {
		validationErrors = append(validationErrors, ValidationError{Field: "thumbnail", Message: "Thumbnail is required."})
	}
	if existing.Level == nil || *existing.Level == "" {
		validationErrors = append(validationErrors, ValidationError{Field: "level", Message: "Level metadata is required."})
	}
	if existing.Language == nil || *existing.Language == "" {
		validationErrors = append(validationErrors, ValidationError{Field: "language", Message: "Language metadata is required."})
	}
	if existing.Price == nil {
		validationErrors = append(validationErrors, ValidationError{Field: "price", Message: "Price is required."})
	}

	// Load sections
	dbSections, err := s.dbQueries.ListSectionsByCourseID(ctx, database.UUIDToPg(courseID))
	if err != nil {
		return nil, err
	}
	if len(dbSections) == 0 {
		validationErrors = append(validationErrors, ValidationError{Field: "sections", Message: "At least one section is required."})
	} else {
		// Load lessons for each section
		for _, sec := range dbSections {
			dbLessons, err := s.dbQueries.ListLessonsBySectionID(ctx, sec.ID)
			if err != nil {
				return nil, err
			}
			if len(dbLessons) == 0 {
				validationErrors = append(validationErrors, ValidationError{Field: "lessons", Message: fmt.Sprintf("Section '%s' must have at least one lesson.", sec.Title)})
			} else {
				for _, les := range dbLessons {
					if les.Title == "" {
						validationErrors = append(validationErrors, ValidationError{Field: "lessons", Message: "Lesson title cannot be empty."})
					}
				}
			}
		}
	}

	return &ValidationResponse{
		Valid:  len(validationErrors) == 0,
		Errors: validationErrors,
	}, nil
}

func (s *Service) GetPreview(ctx context.Context, courseID uuid.UUID, userID uuid.UUID, isAdmin bool) (*CoursePreviewResponse, error) {
	existing, err := s.repo.GetByID(ctx, courseID)
	if err != nil {
		return nil, ErrCourseNotFound
	}

	// Preview is an authoring tool - only owner or admin can access
	if existing.OwnerID != userID && !isAdmin {
		return nil, ErrUnauthorized
	}

	// Load sections
	dbSections, err := s.dbQueries.ListSectionsByCourseID(ctx, database.UUIDToPg(courseID))
	if err != nil {
		return nil, err
	}

	sectionsPreview := make([]*SectionPreview, len(dbSections))
	for i, sec := range dbSections {
		dbLessons, err := s.dbQueries.ListLessonsBySectionID(ctx, sec.ID)
		if err != nil {
			return nil, err
		}

		lessonsPreview := make([]*LessonPreview, len(dbLessons))
		for j, les := range dbLessons {
			durationVal := int(les.Duration.Int32)
			var durationPtr *int
			if les.Duration.Valid {
				durationPtr = &durationVal
			}

			positionVal := int(les.Position.Int32)
			var positionPtr *int
			if les.Position.Valid {
				positionPtr = &positionVal
			}

			lessonsPreview[j] = &LessonPreview{
				ID:       database.PgToUUID(les.ID),
				Title:    les.Title,
				Type:     les.Type,
				Duration: durationPtr,
				Position: positionPtr,
			}
		}

		sectionsPreview[i] = &SectionPreview{
			ID:       database.PgToUUID(sec.ID),
			Title:    sec.Title,
			Position: int(sec.Position),
			Lessons:  lessonsPreview,
		}
	}

	return &CoursePreviewResponse{
		Course:   existing,
		Sections: sectionsPreview,
	}, nil
}

func (s *Service) ListMine(ctx context.Context, userID uuid.UUID) ([]*Course, error) {
	return s.repo.List(ctx, "", userID)
}

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ValidationResponse struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors"`
}

type CoursePreviewResponse struct {
	Course   *Course            `json:"course"`
	Sections []*SectionPreview  `json:"sections"`
}

type SectionPreview struct {
	ID       uuid.UUID        `json:"id"`
	Title    string           `json:"title"`
	Position int              `json:"position"`
	Lessons  []*LessonPreview `json:"lessons"`
}

type LessonPreview struct {
	ID       uuid.UUID `json:"id"`
	Title    string    `json:"title"`
	Type     string    `json:"type"`
	Duration *int      `json:"duration,omitempty"`
	Position *int      `json:"position,omitempty"`
}
