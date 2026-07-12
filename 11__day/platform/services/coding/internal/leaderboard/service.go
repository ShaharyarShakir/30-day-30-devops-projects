package leaderboard

import (
	"context"
	"errors"
)

var ErrLeaderboardEntryNotFound = errors.New("leaderboard entry not found")

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) UpsertEntry(ctx context.Context, req LeaderboardRequest) (*LeaderboardEntry, error) {
	return s.repo.Upsert(ctx, req)
}

func (s *Service) GetLeaderboard(ctx context.Context, problemID, limit, offset, orderBy string) ([]*LeaderboardEntry, error) {
	return s.repo.GetByProblem(ctx, problemID, limit, offset, orderBy)
}

func (s *Service) GetUserRankings(ctx context.Context, userID string) ([]*LeaderboardEntry, error) {
	return s.repo.GetByUser(ctx, userID)
}

func (s *Service) GetUserProblemRanking(ctx context.Context, problemID, userID string) (*LeaderboardEntry, error) {
	entry, err := s.repo.GetByProblemAndUser(ctx, problemID, userID)
	if err != nil {
		return nil, ErrLeaderboardEntryNotFound
	}
	return entry, nil
}
