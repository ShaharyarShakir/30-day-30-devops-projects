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

type WhiteboardService struct {
	repo          *repository.WhiteboardRepository
	redis         *redis.Client
	s3Client      *repository.S3Client
	kafkaProducer *repository.KafkaProducer
	metrics       *metrics.Collector
	logger        *zerolog.Logger
}

func NewWhiteboardService(
	repo *repository.WhiteboardRepository,
	redis *redis.Client,
	s3Client *repository.S3Client,
	kafkaProducer *repository.KafkaProducer,
	metrics *metrics.Collector,
	logger *zerolog.Logger,
) *WhiteboardService {
	return &WhiteboardService{
		repo:          repo,
		redis:         redis,
		s3Client:      s3Client,
		kafkaProducer: kafkaProducer,
		metrics:       metrics,
		logger:        logger,
	}
}

func (s *WhiteboardService) CreateWhiteboard(ctx context.Context, req *models.CreateWhiteboardRequest, userID uuid.UUID) (*models.Whiteboard, error) {
	whiteboard := &models.Whiteboard{
		SessionID: req.SessionID,
		Title:     req.Title,
		CRDTState: "", // Empty initial state
		IsActive:  true,
		IsLocked:  false,
	}

	if err := s.repo.Create(ctx, whiteboard); err != nil {
		s.logger.Error().Err(err).Str("session_id", req.SessionID.String()).Msg("Failed to create whiteboard")
		return nil, err
	}

	// Publish event to Kafka
	event := map[string]interface{}{
		"event_type": "whiteboard.created",
		"whiteboard_id": whiteboard.ID,
		"session_id": whiteboard.SessionID,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}
	
	if err := s.kafkaProducer.Publish(ctx, "classroom.whiteboard.created", event); err != nil {
		s.logger.Error().Err(err).Msg("Failed to publish whiteboard.created event")
	}

	s.metrics.IncrementWhiteboardCreated()
	s.logger.Info().Str("whiteboard_id", whiteboard.ID.String()).Str("session_id", whiteboard.SessionID.String()).Msg("Whiteboard created")

	return whiteboard, nil
}

func (s *WhiteboardService) GetWhiteboard(ctx context.Context, id uuid.UUID) (*models.Whiteboard, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *WhiteboardService) GetSessionWhiteboards(ctx context.Context, sessionID uuid.UUID) ([]*models.Whiteboard, error) {
	return s.repo.GetBySessionID(ctx, sessionID)
}

func (s *WhiteboardService) GetActiveWhiteboard(ctx context.Context, sessionID uuid.UUID) (*models.Whiteboard, error) {
	return s.repo.GetActiveBySessionID(ctx, sessionID)
}

func (s *WhiteboardService) UpdateWhiteboard(ctx context.Context, id uuid.UUID, req *models.UpdateWhiteboardRequest, userID uuid.UUID) (*models.Whiteboard, error) {
	whiteboard, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check if whiteboard is locked
	if whiteboard.IsLocked && whiteboard.LockedBy != nil && *whiteboard.LockedBy != userID {
		return nil, fmt.Errorf("whiteboard is locked by another user")
	}

	if req.Title != nil {
		whiteboard.Title = *req.Title
	}
	if req.CRDTState != nil {
		whiteboard.CRDTState = *req.CRDTState
	}
	if req.IsLocked != nil {
		whiteboard.IsLocked = *req.IsLocked
		if whiteboard.IsLocked {
			whiteboard.LockedBy = &userID
		} else {
			whiteboard.LockedBy = nil
		}
	}

	if err := s.repo.Update(ctx, whiteboard); err != nil {
		s.logger.Error().Err(err).Str("whiteboard_id", id.String()).Msg("Failed to update whiteboard")
		return nil, err
	}

	s.metrics.IncrementWhiteboardUpdated()
	s.logger.Info().Str("whiteboard_id", id.String()).Msg("Whiteboard updated")

	return whiteboard, nil
}

func (s *WhiteboardService) ProcessUpdate(ctx context.Context, update *models.WhiteboardUpdate) error {
	// Publish update to Redis Pub/Sub for real-time sync
	channel := fmt.Sprintf("whiteboard:%s", update.WhiteboardID.String())
	
	updateData := map[string]interface{}{
		"update": update.Update,
		"user_id": update.UserID,
		"timestamp": time.Now().UTC(),
	}
	
	data, err := json.Marshal(updateData)
	if err != nil {
		return err
	}

	if err := s.redis.Publish(ctx, channel, data).Err(); err != nil {
		s.logger.Error().Err(err).Str("whiteboard_id", update.WhiteboardID.String()).Msg("Failed to publish whiteboard update")
		return err
	}

	// Update CRDT state in database
	if err := s.repo.UpdateCRDTState(ctx, update.WhiteboardID, update.Update); err != nil {
		s.logger.Error().Err(err).Str("whiteboard_id", update.WhiteboardID.String()).Msg("Failed to update CRDT state")
		return err
	}

	s.metrics.IncrementWhiteboardUpdates()
	return nil
}

func (s *WhiteboardService) LockWhiteboard(ctx context.Context, req *models.LockWhiteboardRequest, userID uuid.UUID) error {
	if err := s.repo.Lock(ctx, req.WhiteboardID, userID, req.Lock); err != nil {
		s.logger.Error().Err(err).Str("whiteboard_id", req.WhiteboardID.String()).Msg("Failed to lock whiteboard")
		return err
	}

	// Publish lock event
	channel := fmt.Sprintf("whiteboard:%s", req.WhiteboardID.String())
	lockData := map[string]interface{}{
		"event": "lock_changed",
		"locked": req.Lock,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}
	
	data, _ := json.Marshal(lockData)
	s.redis.Publish(ctx, channel, data)

	s.logger.Info().Str("whiteboard_id", req.WhiteboardID.String()).Bool("locked", req.Lock).Msg("Whiteboard lock status changed")
	return nil
}

func (s *WhiteboardService) SetActiveWhiteboard(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	// Deactivate all whiteboards in session
	whiteboard, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Deactivate current active whiteboard
	if active, err := s.repo.GetActiveBySessionID(ctx, whiteboard.SessionID); err == nil {
		s.repo.SetActive(ctx, active.ID, false)
	}

	// Activate new whiteboard
	if err := s.repo.SetActive(ctx, id, true); err != nil {
		return err
	}

	// Publish event
	channel := fmt.Sprintf("session:%s", whiteboard.SessionID.String())
	activeData := map[string]interface{}{
		"event": "whiteboard_activated",
		"whiteboard_id": id,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}
	
	data, _ := json.Marshal(activeData)
	s.redis.Publish(ctx, channel, data)

	s.logger.Info().Str("whiteboard_id", id.String()).Str("session_id", whiteboard.SessionID.String()).Msg("Whiteboard activated")
	return nil
}

func (s *WhiteboardService) DeleteWhiteboard(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	whiteboard, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		s.logger.Error().Err(err).Str("whiteboard_id", id.String()).Msg("Failed to delete whiteboard")
		return err
	}

	// Publish event
	channel := fmt.Sprintf("session:%s", whiteboard.SessionID.String())
	deleteData := map[string]interface{}{
		"event": "whiteboard_deleted",
		"whiteboard_id": id,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}
	
	data, _ := json.Marshal(deleteData)
	s.redis.Publish(ctx, channel, data)

	s.metrics.IncrementWhiteboardDeleted()
	s.logger.Info().Str("whiteboard_id", id.String()).Msg("Whiteboard deleted")
	return nil
}

func (s *WhiteboardService) SaveSnapshot(ctx context.Context, id uuid.UUID) error {
	whiteboard, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Generate snapshot key
	snapshotKey := fmt.Sprintf("whiteboards/%s/snapshot_%d.json", id.String(), time.Now().Unix())
	
	// Upload CRDT state to S3
	if err := s.s3Client.PutObject(ctx, snapshotKey, whiteboard.CRDTState); err != nil {
		s.logger.Error().Err(err).Str("whiteboard_id", id.String()).Msg("Failed to save snapshot to S3")
		return err
	}

	// Update whiteboard with snapshot URL
	snapshotURL := fmt.Sprintf("s3://%s/%s", s.s3Client.Bucket, snapshotKey)
	now := time.Now()
	if err := s.repo.Update(ctx, &models.Whiteboard{
		ID: id,
		SnapshotURL: &snapshotURL,
		LastSnapshotAt: &now,
	}); err != nil {
		return err
	}

	// Publish event
	event := map[string]interface{}{
		"event_type": "whiteboard.snapshot_saved",
		"whiteboard_id": id,
		"session_id": whiteboard.SessionID,
		"snapshot_url": snapshotURL,
		"timestamp": time.Now().UTC(),
	}
	
	s.kafkaProducer.Publish(ctx, "classroom.whiteboard.saved", event)

	s.metrics.IncrementWhiteboardSnapshots()
	s.logger.Info().Str("whiteboard_id", id.String()).Str("snapshot_url", snapshotURL).Msg("Whiteboard snapshot saved")
	return nil
}

func (s *WhiteboardService) AddElement(ctx context.Context, element *models.WhiteboardElement) error {
	if err := s.repo.AddElement(ctx, element); err != nil {
		s.logger.Error().Err(err).Str("whiteboard_id", element.WhiteboardID.String()).Msg("Failed to add element")
		return err
	}

	// Publish element event
	channel := fmt.Sprintf("whiteboard:%s", element.WhiteboardID.String())
	elementData := map[string]interface{}{
		"event": "element_added",
		"element": element,
		"timestamp": time.Now().UTC(),
	}
	
	data, _ := json.Marshal(elementData)
	s.redis.Publish(ctx, channel, data)

	s.metrics.IncrementWhiteboardElements()
	return nil
}

func (s *WhiteboardService) GetElements(ctx context.Context, whiteboardID uuid.UUID) ([]*models.WhiteboardElement, error) {
	return s.repo.GetElements(ctx, whiteboardID)
}
