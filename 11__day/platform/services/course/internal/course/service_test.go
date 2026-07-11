package course

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/platform/services/course/internal/event"
)

type mockRepo struct {
	courses map[uuid.UUID]*Course
	slugs   map[string]*Course
	events  []string
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		courses: make(map[uuid.UUID]*Course),
		slugs:   make(map[string]*Course),
	}
}

func (m *mockRepo) Create(ctx context.Context, course *Course, categoryIDs []uuid.UUID) (*Course, error) {
	m.courses[course.ID] = course
	m.slugs[course.Slug] = course
	m.events = append(m.events, "course.created")
	return course, nil
}

func (m *mockRepo) GetByID(ctx context.Context, id uuid.UUID) (*Course, error) {
	c, ok := m.courses[id]
	if !ok {
		return nil, errors.New("course not found")
	}
	return c, nil
}

func (m *mockRepo) GetBySlug(ctx context.Context, slug string) (*Course, error) {
	c, ok := m.slugs[slug]
	if !ok {
		return nil, errors.New("course not found")
	}
	return c, nil
}

func (m *mockRepo) Update(ctx context.Context, course *Course, categoryIDs []uuid.UUID) (*Course, error) {
	m.courses[course.ID] = course
	m.slugs[course.Slug] = course
	if course.Status == "PUBLISHED" {
		m.events = append(m.events, "course.published")
	} else {
		m.events = append(m.events, "course.updated")
	}
	return course, nil
}

func (m *mockRepo) Delete(ctx context.Context, id uuid.UUID) error {
	c, ok := m.courses[id]
	if ok {
		delete(m.courses, id)
		delete(m.slugs, c.Slug)
		m.events = append(m.events, "course.deleted")
	}
	return nil
}

func (m *mockRepo) List(ctx context.Context, status string, ownerID uuid.UUID) ([]*Course, error) {
	var res []*Course
	for _, c := range m.courses {
		if ownerID != uuid.Nil && c.OwnerID != ownerID {
			continue
		}
		if status != "" && c.Status != status {
			continue
		}
		res = append(res, c)
	}
	return res, nil
}

type mockPublisher struct {
	events []string
}

func (m *mockPublisher) Publish(ctx context.Context, eventType event.EventType, key string, payload interface{}) error {
	m.events = append(m.events, string(eventType))
	return nil
}

func (m *mockPublisher) Close() error {
	return nil
}

func TestSlugify(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Hello World", "hello-world"},
		{"Go 1.26 Release!", "go-126-release"},
		{"  Spaces  And---Dashes  ", "spaces-and-dashes"},
		{"AI-Powered Coding", "ai-powered-coding"},
	}

	for _, test := range tests {
		output := slugify(test.input)
		if output != test.expected {
			t.Errorf("slugify(%q) = %q; want %q", test.input, output, test.expected)
		}
	}
}

func TestCreateCourse(t *testing.T) {
	repo := newMockRepo()
	pub := &mockPublisher{}
	srv := NewService(repo, nil, pub)

	ownerID := uuid.New()
	req := CreateCourseRequest{
		Title: "Test Go Service",
	}

	created, err := srv.Create(context.Background(), ownerID, req)
	if err != nil {
		t.Fatalf("failed to create course: %v", err)
	}

	if created.Status != "DRAFT" {
		t.Errorf("expected status DRAFT, got %s", created.Status)
	}

	if created.Slug != "test-go-service" {
		t.Errorf("expected slug test-go-service, got %s", created.Slug)
	}

	if created.OwnerID != ownerID {
		t.Errorf("expected owner ID %v, got %v", ownerID, created.OwnerID)
	}

	if len(repo.events) != 1 || repo.events[0] != "course.created" {
		t.Errorf("expected course.created outbox event to be queued, got: %v", repo.events)
	}
}

func TestUpdateCourse_Permissions(t *testing.T) {
	repo := newMockRepo()
	pub := &mockPublisher{}
	srv := NewService(repo, nil, pub)

	ownerID := uuid.New()
	courseID := uuid.New()
	repo.courses[courseID] = &Course{
		ID:      courseID,
		OwnerID: ownerID,
		Title:   "Original Title",
		Slug:    "original-title",
		Status:  "DRAFT",
	}

	// 1. Update by owner (should succeed)
	req := UpdateCourseRequest{
		Title:  "Updated Title",
		Slug:   "updated-title",
		Status: "DRAFT",
	}
	updated, err := srv.Update(context.Background(), courseID, ownerID, false, req)
	if err != nil {
		t.Fatalf("failed to update course by owner: %v", err)
	}
	if updated.Title != "Updated Title" {
		t.Errorf("expected title 'Updated Title', got %s", updated.Title)
	}

	// 2. Update by non-owner (should fail)
	otherUser := uuid.New()
	_, err = srv.Update(context.Background(), courseID, otherUser, false, req)
	if !errors.Is(err, ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}

	// 3. Update by admin (should succeed)
	updatedAdmin, err := srv.Update(context.Background(), courseID, otherUser, true, req)
	if err != nil {
		t.Fatalf("failed to update course by admin: %v", err)
	}
	if updatedAdmin.Title != "Updated Title" {
		t.Errorf("expected title 'Updated Title', got %s", updatedAdmin.Title)
	}
}
