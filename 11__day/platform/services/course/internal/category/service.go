package category

import (
	"context"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListCategories(ctx context.Context) ([]Category, error) {
	return s.repo.List(ctx)
}
