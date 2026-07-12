package problem

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrProblemNotFound = errors.New("problem not found")

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetByID(ctx context.Context, id string) (*Problem, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	p, err := s.repo.GetByID(ctx, uid)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrProblemNotFound
	}
	return p, nil
}

func (s *Service) GetBySlug(ctx context.Context, slug string) (*Problem, error) {
	p, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrProblemNotFound
	}
	return p, nil
}

func (s *Service) List(ctx context.Context) ([]*Problem, error) {
	return s.repo.List(ctx)
}

func (s *Service) Create(ctx context.Context, req CreateProblemRequest) (*Problem, error) {
	return s.repo.Create(ctx, req)
}

func (s *Service) Update(ctx context.Context, id string, req UpdateProblemRequest) (*Problem, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, uid, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, uid)
}

func (s *Service) GetLanguages(ctx context.Context, id string) ([]*ProblemLanguage, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	return s.repo.GetLanguages(ctx, uid)
}

func (s *Service) GetTestCases(ctx context.Context, id string) ([]*TestCase, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	return s.repo.GetTestCases(ctx, uid)
}
