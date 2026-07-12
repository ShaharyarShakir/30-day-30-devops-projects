package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/platform/classroom/internal/metrics"
	"github.com/platform/classroom/internal/models"
	"github.com/platform/classroom/internal/repository"
)

type PollService struct {
	repo          *repository.PollRepository
	redis         *redis.Client
	kafkaProducer *repository.KafkaProducer
	metrics       *metrics.Collector
	logger        *zerolog.Logger
}

func NewPollService(
	repo *repository.PollRepository,
	redis *redis.Client,
	kafkaProducer *repository.KafkaProducer,
	metrics *metrics.Collector,
	logger *zerolog.Logger,
) *PollService {
	return &PollService{
		repo:          repo,
		redis:         redis,
		kafkaProducer: kafkaProducer,
		metrics:       metrics,
		logger:        logger,
	}
}

func (s *PollService) CreatePoll(ctx context.Context, req *models.CreatePollRequest, userID uuid.UUID) (*models.Poll, error) {
	optionsJSON, err := json.Marshal(req.Options)
	if err != nil {
		return nil, err
	}

	poll := &models.Poll{
		SessionID:     req.SessionID,
		Question:      req.Question,
		Options:       string(optionsJSON),
		AllowMultiple: req.AllowMultiple,
		IsAnonymous:   req.IsAnonymous,
		Status:        "draft",
		CreatedBy:     userID,
	}

	if err := s.repo.Create(ctx, poll); err != nil {
		s.logger.Error().Err(err).Str("session_id", req.SessionID.String()).Msg("Failed to create poll")
		return nil, err
	}

	s.metrics.IncrementPollCreated()
	s.logger.Info().Str("poll_id", poll.ID.String()).Str("session_id", poll.SessionID.String()).Msg("Poll created")

	return poll, nil
}

func (s *PollService) GetPoll(ctx context.Context, id uuid.UUID) (*models.Poll, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *PollService) GetSessionPolls(ctx context.Context, sessionID uuid.UUID) ([]*models.Poll, error) {
	return s.repo.GetBySessionID(ctx, sessionID)
}

func (s *PollService) GetActivePoll(ctx context.Context, sessionID uuid.UUID) (*models.Poll, error) {
	return s.repo.GetActiveBySessionID(ctx, sessionID)
}

func (s *PollService) UpdatePoll(ctx context.Context, id uuid.UUID, req *models.UpdatePollRequest, userID uuid.UUID) (*models.Poll, error) {
	poll, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Only allow updates if poll is in draft status
	if poll.Status != "draft" {
		return nil, fmt.Errorf("can only update polls in draft status")
	}

	if req.Question != nil {
		poll.Question = *req.Question
	}
	if req.Options != nil {
		optionsJSON, err := json.Marshal(*req.Options)
		if err != nil {
			return nil, err
		}
		poll.Options = string(optionsJSON)
	}
	if req.AllowMultiple != nil {
		poll.AllowMultiple = *req.AllowMultiple
	}
	if req.IsAnonymous != nil {
		poll.IsAnonymous = *req.IsAnonymous
	}

	if err := s.repo.Update(ctx, poll); err != nil {
		s.logger.Error().Err(err).Str("poll_id", id.String()).Msg("Failed to update poll")
		return nil, err
	}

	s.metrics.IncrementPollUpdated()
	s.logger.Info().Str("poll_id", id.String()).Msg("Poll updated")

	return poll, nil
}

func (s *PollService) PublishPoll(ctx context.Context, req *models.PublishPollRequest, userID uuid.UUID) error {
	poll, err := s.repo.GetByID(ctx, req.PollID)
	if err != nil {
		return err
	}

	// Deactivate current active poll in session
	if activePoll, err := s.repo.GetActiveBySessionID(ctx, poll.SessionID); err == nil {
		s.repo.UpdateStatus(ctx, activePoll.ID, "completed")
	}

	now := time.Now()
	poll.Status = "active"
	poll.PublishedAt = &now

	if err := s.repo.Update(ctx, poll); err != nil {
		s.logger.Error().Err(err).Str("poll_id", req.PollID.String()).Msg("Failed to publish poll")
		return err
	}

	// Publish event to Redis
	channel := fmt.Sprintf("session:%s", poll.SessionID.String())
	publishData := map[string]interface{}{
		"event": "poll_published",
		"poll_id": poll.ID,
		"question": poll.Question,
		"options": poll.Options,
		"allow_multiple": poll.AllowMultiple,
		"is_anonymous": poll.IsAnonymous,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}

	data, _ := json.Marshal(publishData)
	s.redis.Publish(ctx, channel, data)

	// Publish to Kafka
	event := map[string]interface{}{
		"event_type": "classroom.poll.created",
		"poll_id": poll.ID,
		"session_id": poll.SessionID,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}
	s.kafkaProducer.Publish(ctx, "classroom.poll.created", event)

	s.metrics.IncrementPollPublished()
	s.logger.Info().Str("poll_id", req.PollID.String()).Str("session_id", poll.SessionID.String()).Msg("Poll published")

	return nil
}

func (s *PollService) CompletePoll(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	poll, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	now := time.Now()
	poll.Status = "completed"
	poll.CompletedAt = &now

	if err := s.repo.Update(ctx, poll); err != nil {
		s.logger.Error().Err(err).Str("poll_id", id.String()).Msg("Failed to complete poll")
		return err
	}

	// Get results
	results, err := s.repo.GetResults(ctx, id)
	if err != nil {
		s.logger.Error().Err(err).Str("poll_id", id.String()).Msg("Failed to get poll results")
	}

	// Publish event to Redis
	channel := fmt.Sprintf("session:%s", poll.SessionID.String())
	completeData := map[string]interface{}{
		"event": "poll_completed",
		"poll_id": poll.ID,
		"results": results,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}

	data, _ := json.Marshal(completeData)
	s.redis.Publish(ctx, channel, data)

	// Publish to Kafka
	event := map[string]interface{}{
		"event_type": "classroom.poll.completed",
		"poll_id": poll.ID,
		"session_id": poll.SessionID,
		"results": results,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}
	s.kafkaProducer.Publish(ctx, "classroom.poll.completed", event)

	s.metrics.IncrementPollCompleted()
	s.logger.Info().Str("poll_id", id.String()).Msg("Poll completed")

	return nil
}

func (s *PollService) Vote(ctx context.Context, req *models.VoteRequest, userID uuid.UUID) error {
	poll, err := s.repo.GetByID(ctx, req.PollID)
	if err != nil {
		return err
	}

	// Check if poll is active
	if poll.Status != "active" {
		return fmt.Errorf("poll is not active")
	}

	// Validate options
	if !poll.AllowMultiple && len(req.OptionIDs) > 1 {
		return fmt.Errorf("poll does not allow multiple selections")
	}

	// Create/update vote
	optionIDsJSON, err := json.Marshal(req.OptionIDs)
	if err != nil {
		return err
	}
	vote := &models.PollVote{
		PollID:    req.PollID,
		UserID:    userID,
		OptionIDs: string(optionIDsJSON),
	}

	if err := s.repo.CreateVote(ctx, vote); err != nil {
		s.logger.Error().Err(err).Str("poll_id", req.PollID.String()).Msg("Failed to record vote")
		return err
	}

	// Publish vote event to Redis (if not anonymous)
	if !poll.IsAnonymous {
		channel := fmt.Sprintf("poll:%s", req.PollID.String())
		voteData := map[string]interface{}{
			"event": "vote_cast",
			"user_id": userID,
			"option_ids": req.OptionIDs,
			"timestamp": time.Now().UTC(),
		}

		data, _ := json.Marshal(voteData)
		s.redis.Publish(ctx, channel, data)
	}

	// Publish updated results
	results, err := s.repo.GetResults(ctx, req.PollID)
	if err == nil {
		channel := fmt.Sprintf("poll:%s", req.PollID.String())
		resultsData := map[string]interface{}{
			"event": "results_updated",
			"results": results,
			"timestamp": time.Now().UTC(),
		}

		data, _ := json.Marshal(resultsData)
		s.redis.Publish(ctx, channel, data)
	}

	s.metrics.IncrementPollVotes()
	s.logger.Info().Str("poll_id", req.PollID.String()).Str("user_id", userID.String()).Msg("Vote recorded")

	return nil
}

func (s *PollService) GetResults(ctx context.Context, id uuid.UUID) ([]*models.PollResult, error) {
	return s.repo.GetResults(ctx, id)
}

func (s *PollService) GetUserVote(ctx context.Context, pollID, userID uuid.UUID) (*models.PollVote, error) {
	return s.repo.GetUserVote(ctx, pollID, userID)
}

func (s *PollService) DeletePoll(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	poll, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Only allow deletion of draft polls
	if poll.Status != "draft" {
		return fmt.Errorf("can only delete polls in draft status")
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		s.logger.Error().Err(err).Str("poll_id", id.String()).Msg("Failed to delete poll")
		return err
	}

	s.metrics.IncrementPollDeleted()
	s.logger.Info().Str("poll_id", id.String()).Msg("Poll deleted")

	return nil
}
