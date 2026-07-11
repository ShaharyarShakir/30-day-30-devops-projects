package course

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/platform/services/course/internal/category"
	"github.com/platform/services/course/internal/database"
	"github.com/platform/services/course/internal/event"
)

type Repository interface {
	Create(ctx context.Context, course *Course, categoryIDs []uuid.UUID) (*Course, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Course, error)
	GetBySlug(ctx context.Context, slug string) (*Course, error)
	Update(ctx context.Context, course *Course, categoryIDs []uuid.UUID) (*Course, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, status string, ownerID uuid.UUID) ([]*Course, error)
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

func mapToDomain(c database.Course, cats []database.Category, objs []database.CourseObjective, reqs []database.CourseRequirement, tgts []database.CourseTarget) *Course {
	domainCats := make([]category.Category, len(cats))
	for i, cat := range cats {
		domainCats[i] = category.Category{
			ID:   database.PgToUUID(cat.ID),
			Name: cat.Name,
		}
	}

	objectives := make([]string, len(objs))
	for i, o := range objs {
		objectives[i] = o.Objective
	}

	requirements := make([]string, len(reqs))
	for i, r := range reqs {
		requirements[i] = r.Requirement
	}

	targets := make([]string, len(tgts))
	for i, t := range tgts {
		targets[i] = t.Target
	}

	return &Course{
		ID:              database.PgToUUID(c.ID),
		OwnerID:         database.PgToUUID(c.OwnerID),
		Title:           c.Title,
		Slug:            c.Slug,
		Subtitle:        database.PgToStringPtr(c.Subtitle),
		Description:     database.PgToStringPtr(c.Description),
		Level:           database.PgToStringPtr(c.Level),
		Language:        database.PgToStringPtr(c.Language),
		Price:           database.PgNumericToFloat64Ptr(c.Price),
		ThumbnailURL:    database.PgToStringPtr(c.ThumbnailUrl),
		Status:          c.Status,
		Categories:      domainCats,
		Objectives:      objectives,
		Requirements:    requirements,
		TargetAudiences: targets,
		CreatedAt:       database.PgToTime(c.CreatedAt),
		UpdatedAt:       database.PgToTime(c.UpdatedAt),
	}
}

func (r *PostgresRepository) loadMetadata(ctx context.Context, q *database.Queries, courseID pgtype.UUID) (objs []database.CourseObjective, reqs []database.CourseRequirement, tgts []database.CourseTarget, err error) {
	objs, err = q.ListObjectivesByCourseID(ctx, courseID)
	if err != nil {
		return
	}
	reqs, err = q.ListRequirementsByCourseID(ctx, courseID)
	if err != nil {
		return
	}
	tgts, err = q.ListTargetsByCourseID(ctx, courseID)
	return
}

func (r *PostgresRepository) Create(ctx context.Context, c *Course, categoryIDs []uuid.UUID) (*Course, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	params := database.CreateCourseParams{
		ID:           database.UUIDToPg(c.ID),
		OwnerID:      database.UUIDToPg(c.OwnerID),
		Title:        c.Title,
		Slug:         c.Slug,
		Subtitle:     database.StringPtrToPg(c.Subtitle),
		Description:  database.StringPtrToPg(c.Description),
		Level:        database.StringPtrToPg(c.Level),
		Language:     database.StringPtrToPg(c.Language),
		Price:        database.Float64PtrToPgNumeric(c.Price),
		ThumbnailUrl: database.StringPtrToPg(c.ThumbnailURL),
		Status:       c.Status,
		CreatedAt:    database.TimeToPg(c.CreatedAt),
		UpdatedAt:    database.TimeToPg(c.UpdatedAt),
	}

	dbCourse, err := qtx.CreateCourse(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create course: %w", err)
	}

	for _, catID := range categoryIDs {
		err = qtx.AddCourseCategory(ctx, database.AddCourseCategoryParams{
			CourseID:   dbCourse.ID,
			CategoryID: database.UUIDToPg(catID),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to add course category: %w", err)
		}
	}

	// Insert objectives
	for i, obj := range c.Objectives {
		_, err = qtx.CreateObjective(ctx, database.CreateObjectiveParams{
			ID:        database.UUIDToPg(uuid.New()),
			CourseID:  dbCourse.ID,
			Objective: obj,
			Position:  int32(i + 1),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create course objective: %w", err)
		}
	}

	// Insert requirements
	for i, req := range c.Requirements {
		_, err = qtx.CreateRequirement(ctx, database.CreateRequirementParams{
			ID:          database.UUIDToPg(uuid.New()),
			CourseID:    dbCourse.ID,
			Requirement: req,
			Position:    int32(i + 1),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create course requirement: %w", err)
		}
	}

	// Insert target audience
	for i, tgt := range c.TargetAudiences {
		_, err = qtx.CreateTarget(ctx, database.CreateTargetParams{
			ID:       database.UUIDToPg(uuid.New()),
			CourseID: dbCourse.ID,
			Target:   tgt,
			Position: int32(i + 1),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create course target audience: %w", err)
		}
	}

	dbCats, err := qtx.ListCategoriesByCourseID(ctx, dbCourse.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to list categories: %w", err)
	}

	objs, reqs, tgts, err := r.loadMetadata(ctx, qtx, dbCourse.ID)
	if err != nil {
		return nil, err
	}

	// Queue course.created in same transaction
	err = event.QueueOutboxEvent(ctx, qtx, database.PgToUUID(dbCourse.ID), "course", "course.created", map[string]interface{}{
		"id":         database.PgToUUID(dbCourse.ID),
		"owner_id":   database.PgToUUID(dbCourse.OwnerID),
		"title":      dbCourse.Title,
		"slug":       dbCourse.Slug,
		"status":     dbCourse.Status,
		"created_at": database.PgToTime(dbCourse.CreatedAt),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to queue course.created event: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return mapToDomain(dbCourse, dbCats, objs, reqs, tgts), nil
}

func (r *PostgresRepository) Update(ctx context.Context, c *Course, categoryIDs []uuid.UUID) (*Course, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	params := database.UpdateCourseParams{
		ID:           database.UUIDToPg(c.ID),
		Title:        c.Title,
		Slug:         c.Slug,
		Subtitle:     database.StringPtrToPg(c.Subtitle),
		Description:  database.StringPtrToPg(c.Description),
		Level:        database.StringPtrToPg(c.Level),
		Language:     database.StringPtrToPg(c.Language),
		Price:        database.Float64PtrToPgNumeric(c.Price),
		ThumbnailUrl: database.StringPtrToPg(c.ThumbnailURL),
		Status:       c.Status,
		UpdatedAt:    database.TimeToPg(c.UpdatedAt),
	}

	dbCourse, err := qtx.UpdateCourse(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to update course: %w", err)
	}

	err = qtx.ClearCourseCategories(ctx, dbCourse.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to clear course categories: %w", err)
	}

	for _, catID := range categoryIDs {
		err = qtx.AddCourseCategory(ctx, database.AddCourseCategoryParams{
			CourseID:   dbCourse.ID,
			CategoryID: database.UUIDToPg(catID),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to add course category: %w", err)
		}
	}

	// Update learning model metadata
	err = qtx.ClearObjectives(ctx, dbCourse.ID)
	if err != nil {
		return nil, err
	}
	for i, obj := range c.Objectives {
		_, err = qtx.CreateObjective(ctx, database.CreateObjectiveParams{
			ID:        database.UUIDToPg(uuid.New()),
			CourseID:  dbCourse.ID,
			Objective: obj,
			Position:  int32(i + 1),
		})
		if err != nil {
			return nil, err
		}
	}

	err = qtx.ClearRequirements(ctx, dbCourse.ID)
	if err != nil {
		return nil, err
	}
	for i, req := range c.Requirements {
		_, err = qtx.CreateRequirement(ctx, database.CreateRequirementParams{
			ID:          database.UUIDToPg(uuid.New()),
			CourseID:    dbCourse.ID,
			Requirement: req,
			Position:    int32(i + 1),
		})
		if err != nil {
			return nil, err
		}
	}

	err = qtx.ClearTargets(ctx, dbCourse.ID)
	if err != nil {
		return nil, err
	}
	for i, tgt := range c.TargetAudiences {
		_, err = qtx.CreateTarget(ctx, database.CreateTargetParams{
			ID:       database.UUIDToPg(uuid.New()),
			CourseID: dbCourse.ID,
			Target:   tgt,
			Position: int32(i + 1),
		})
		if err != nil {
			return nil, err
		}
	}

	dbCats, err := qtx.ListCategoriesByCourseID(ctx, dbCourse.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to list categories: %w", err)
	}

	objs, reqs, tgts, err := r.loadMetadata(ctx, qtx, dbCourse.ID)
	if err != nil {
		return nil, err
	}

	// Queue course.updated or course.published event in same transaction
	evtType := "course.updated"
	if dbCourse.Status == "PUBLISHED" {
		evtType = "course.published"
	}

	err = event.QueueOutboxEvent(ctx, qtx, database.PgToUUID(dbCourse.ID), "course", evtType, map[string]interface{}{
		"id":         database.PgToUUID(dbCourse.ID),
		"owner_id":   database.PgToUUID(dbCourse.OwnerID),
		"title":      dbCourse.Title,
		"slug":       dbCourse.Slug,
		"status":     dbCourse.Status,
		"price":      database.PgNumericToFloat64Ptr(dbCourse.Price),
		"updated_at": database.PgToTime(dbCourse.UpdatedAt),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to queue outbox course update event: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return mapToDomain(dbCourse, dbCats, objs, reqs, tgts), nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*Course, error) {
	dbCourse, err := r.queries.GetCourseByID(ctx, database.UUIDToPg(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("course not found")
		}
		return nil, err
	}

	dbCats, err := r.queries.ListCategoriesByCourseID(ctx, dbCourse.ID)
	if err != nil {
		return nil, err
	}

	objs, reqs, tgts, err := r.loadMetadata(ctx, r.queries, dbCourse.ID)
	if err != nil {
		return nil, err
	}

	return mapToDomain(dbCourse, dbCats, objs, reqs, tgts), nil
}

func (r *PostgresRepository) GetBySlug(ctx context.Context, slug string) (*Course, error) {
	dbCourse, err := r.queries.GetCourseBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("course not found")
		}
		return nil, err
	}

	dbCats, err := r.queries.ListCategoriesByCourseID(ctx, dbCourse.ID)
	if err != nil {
		return nil, err
	}

	objs, reqs, tgts, err := r.loadMetadata(ctx, r.queries, dbCourse.ID)
	if err != nil {
		return nil, err
	}

	return mapToDomain(dbCourse, dbCats, objs, reqs, tgts), nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	// Fetch slug for deleted event payload before delete cascade removes it
	dbCourse, err := qtx.GetCourseByID(ctx, database.UUIDToPg(id))
	if err != nil {
		return err
	}

	err = qtx.DeleteCourse(ctx, database.UUIDToPg(id))
	if err != nil {
		return err
	}

	err = event.QueueOutboxEvent(ctx, qtx, id, "course", "course.deleted", map[string]interface{}{
		"id":   id,
		"slug": dbCourse.Slug,
	})
	if err != nil {
		return fmt.Errorf("failed to queue course.deleted outbox event: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) List(ctx context.Context, status string, ownerID uuid.UUID) ([]*Course, error) {
	var dbCourses []database.Course
	var err error

	if ownerID != uuid.Nil {
		dbCourses, err = r.queries.ListCoursesByOwner(ctx, database.UUIDToPg(ownerID))
	} else if status == "PUBLISHED" {
		dbCourses, err = r.queries.ListPublishedCourses(ctx)
	} else {
		dbCourses, err = r.queries.ListCourses(ctx)
	}

	if err != nil {
		return nil, err
	}

	courses := make([]*Course, len(dbCourses))
	for i, c := range dbCourses {
		dbCats, err := r.queries.ListCategoriesByCourseID(ctx, c.ID)
		if err != nil {
			return nil, err
		}
		objs, reqs, tgts, err := r.loadMetadata(ctx, r.queries, c.ID)
		if err != nil {
			return nil, err
		}
		courses[i] = mapToDomain(c, dbCats, objs, reqs, tgts)
	}

	return courses, nil
}
