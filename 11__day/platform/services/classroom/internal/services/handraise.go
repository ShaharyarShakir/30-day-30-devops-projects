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

type HandRaiseService struct {
	repo          *repository.HandRaiseRepository
	redis         *redis.Client
	kafkaProducer *repository.KafkaProducer
	metrics       *metrics.Collector
	logger        *zerolog.Logger
}

func NewHandRaiseService(
	repo *repository.HandRaiseRepository,
	redis *redis.Client,
	kafkaProducer *repository.KafkaProducer,
	metrics *metrics.Collector,
	logger *zerolog.Logger,
) *HandRaiseService {
	return &HandRaiseService{
		repo:          repo,
		redis:         redis,
		kafkaProducer: kafkaProducer,
		metrics:       metrics,
		logger:        logger,
	}
}

func (s *HandRaiseService) RaiseHand(ctx context.Context, req *models.RaiseHandRequest, userID uuid.UUID) (*models.HandRaise, error) {
	// Check if user already has an active hand raise
	existing, err := s.repo.GetUserActiveHandRaise(ctx, req.SessionID, userID)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("already have an active hand raise")
	}

	handRaise := &models.HandRaise{
		SessionID: req.SessionID,
		UserID:    userID,
		Status:    "pending",
	}

	if err := s.repo.Create(ctx, handRaise); err != nil {
		s.logger.Error().Err(err).Str("session_id", req.SessionID.String()).Str("user_id", userID.String()).Msg("Failed to raise hand")
		return nil, err
	}

	// Publish event to Redis
	channel := fmt.Sprintf("session:%s", req.SessionID.String())
	raiseData := map[string]interface{}{
		"event": "hand_raised",
		"hand_raise_id": handRaise.ID,
		"user_id": userID,
		"queue_position": handRaise.QueuePosition,
		"timestamp": time.Now().UTC(),
	}

	data, _ := json.Marshal(raiseData)
	s.redis.Publish(ctx, channel, data)

	// Publish to Kafka
	event := map[string]interface{}{
		"event_type": "classroom.hand.raise",
		"hand_raise_id": handRaise.ID,
		"session_id": handRaise.SessionID,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}
	s.kafkaProducer.Publish(ctx, "classroom.hand.raise", event)

	s.metrics.IncrementHandRaises()
	s.logger.Info().Str("hand_raise_id", handRaise.ID.String()).Str("user_id", userID.String()).Int("queue_position", *handRaise.QueuePosition).Msg("Hand raised")

	return handRaise, nil
}

func (s *HandRaiseService) GetQueue(ctx context.Context, sessionID uuid.UUID) ([]*models.HandRaise, error) {
	return s.repo.GetPendingQueue(ctx, sessionID)
}

func (s *HandRaiseService) ApproveHandRaise(ctx context.Context, req *models.ApproveHandRaiseRequest, instructorID uuid.UUID) error {
	handRaise, err := s.repo.GetByID(ctx, req.HandRaiseID)
	if err != nil {
		return err
	}

	if handRaise.Status != "pending" {
		return fmt.Errorf("hand raise is not pending")
	}

	if err := s.repo.UpdateStatus(ctx, req.HandRaiseID, "approved", &instructorID, nil); err != nil {
		s.logger.Error().Err(err).Str("hand_raise_id", req.HandRaiseID.String()).Msg("Failed to approve hand raise")
		return err
	}

	// Reorder queue
	s.repo.ReorderQueue(ctx, handRaise.SessionID)

	// Publish event to Redis
	channel := fmt.Sprintf("session:%s", handRaise.SessionID.String())
	approveData := map[string]interface{}{
		"event": "hand_approved",
		"hand_raise_id": handRaise.ID,
		"user_id": handRaise.UserID,
		"approved_by": instructorID,
		"timestamp": time.Now().UTC(),
	}

	data, _ := json.Marshal(approveData)
	s.redis.Publish(ctx, channel, data)

	s.metrics.IncrementHandRaisesApproved()
	s.logger.Info().Str("hand_raise_id", req.HandRaiseID.String()).Str("user_id", handRaise.UserID.String()).Msg("Hand raise approved")

	return nil
}

func (s *HandRaiseService) RejectHandRaise(ctx context.Context, req *models.RejectHandRaiseRequest, instructorID uuid.UUID) error {
	handRaise, err := s.repo.GetByID(ctx, req.HandRaiseID)
	if err != nil {
		return err
	}

	if handRaise.Status != "pending" {
		return fmt.Errorf("hand raise is not pending")
	}

	if err := s.repo.UpdateStatus(ctx, req.HandRaiseID, "rejected", nil, &instructorID); err != nil {
		s.logger.Error().Err(err).Str("hand_raise_id", req.HandRaiseID.String()).Msg("Failed to reject hand raise")
		return err
	}

	// Reorder queue
	s.repo.ReorderQueue(ctx, handRaise.SessionID)

	// Publish event to Redis
	channel := fmt.Sprintf("session:%s", handRaise.SessionID.String())
	rejectData := map[string]interface{}{
		"event": "hand_rejected",
		"hand_raise_id": handRaise.ID,
		"user_id": handRaise.UserID,
		"rejected_by": instructorID,
		"reason": req.Reason,
		"timestamp": time.Now().UTC(),
	}

	data, _ := json.Marshal(rejectData)
	s.redis.Publish(ctx, channel, data)

	s.metrics.IncrementHandRaisesRejected()
	s.logger.Info().Str("hand_raise_id", req.HandRaiseID.String()).Str("user_id", handRaise.UserID.String()).Msg("Hand raise rejected")

	return nil
}

func (s *HandRaiseService) CancelHandRaise(ctx context.Context, req *models.CancelHandRaiseRequest, userID uuid.UUID) error {
	handRaise, err := s.repo.GetByID(ctx, req.HandRaiseID)
	if err != nil {
		return err
	}

	if handRaise.UserID != userID {
		return fmt.Errorf("can only cancel your own hand raise")
	}

	if handRaise.Status != "pending" {
		return fmt.Errorf("can only cancel pending hand raises")
	}

	if err := s.repo.Cancel(ctx, req.HandRaiseID); err != nil {
		s.logger.Error().Err(err).Str("hand_raise_id", req.HandRaiseID.String()).Msg("Failed to cancel hand raise")
		return err
	}

	// Reorder queue
	s.repo.ReorderQueue(ctx, handRaise.SessionID)

	// Publish event to Redis
	channel := fmt.Sprintf("session:%s", handRaise.SessionID.String())
	cancelData := map[string]interface{}{
		"event": "hand_cancelled",
		"hand_raise_id": handRaise.ID,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}

	data, _ := json.Marshal(cancelData)
	s.redis.Publish(ctx, channel, data)

	s.logger.Info().Str("hand_raise_id", req.HandRaiseID.String()).Str("user_id", userID.String()).Msg("Hand raise cancelled")

	return nil
}

func (s *HandRaiseService) GetSessionHandRaises(ctx context.Context, sessionID uuid.UUID) ([]*models.HandRaise, error) {
	return s.repo.GetBySessionID(ctx, sessionID)
}
