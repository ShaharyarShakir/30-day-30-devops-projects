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

type NotesService struct {
	repo          *repository.NotesRepository
	redis         *redis.Client
	kafkaProducer *repository.KafkaProducer
	metrics       *metrics.Collector
	logger        *zerolog.Logger
}

func NewNotesService(
	repo *repository.NotesRepository,
	redis *redis.Client,
	kafkaProducer *repository.KafkaProducer,
	metrics *metrics.Collector,
	logger *zerolog.Logger,
) *NotesService {
	return &NotesService{
		repo:          repo,
		redis:         redis,
		kafkaProducer: kafkaProducer,
		metrics:       metrics,
		logger:        logger,
	}
}

func (s *NotesService) CreateNotes(ctx context.Context, req *models.CreateNotesRequest, userID uuid.UUID) (*models.SharedNotes, error) {
	notes := &models.SharedNotes{
		SessionID: req.SessionID,
		Title:     req.Title,
		Content:   req.Content,
		IsPublic:  req.IsPublic,
		CreatedBy: userID,
	}

	if err := s.repo.Create(ctx, notes); err != nil {
		s.logger.Error().Err(err).Str("session_id", req.SessionID.String()).Msg("Failed to create notes")
		return nil, err
	}

	s.metrics.IncrementNotesCreated()
	s.logger.Info().Str("notes_id", notes.ID.String()).Str("session_id", notes.SessionID.String()).Msg("Notes created")

	return notes, nil
}

func (s *NotesService) GetNotes(ctx context.Context, id uuid.UUID) (*models.SharedNotes, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *NotesService) GetSessionNotes(ctx context.Context, sessionID uuid.UUID) ([]*models.SharedNotes, error) {
	return s.repo.GetBySessionID(ctx, sessionID)
}

func (s *NotesService) GetPublicNotes(ctx context.Context, sessionID uuid.UUID) (*models.SharedNotes, error) {
	return s.repo.GetPublicBySessionID(ctx, sessionID)
}

func (s *NotesService) UpdateNotes(ctx context.Context, id uuid.UUID, req *models.UpdateNotesRequest, userID uuid.UUID) (*models.SharedNotes, error) {
	notes, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if req.Title != nil {
		notes.Title = *req.Title
	}
	if req.Content != nil {
		notes.Content = *req.Content
	}
	if req.CRDTState != nil {
		notes.CRDTState = req.CRDTState
	}
	if req.IsPublic != nil {
		notes.IsPublic = *req.IsPublic
	}

	now := time.Now()
	notes.LastEditedBy = &userID
	notes.LastEditedAt = &now

	if err := s.repo.Update(ctx, notes); err != nil {
		s.logger.Error().Err(err).Str("notes_id", id.String()).Msg("Failed to update notes")
		return nil, err
	}

	s.metrics.IncrementNotesUpdated()
	s.logger.Info().Str("notes_id", id.String()).Msg("Notes updated")

	return notes, nil
}

func (s *NotesService) ProcessUpdate(ctx context.Context, update *models.NotesUpdate) error {
	// Publish update to Redis Pub/Sub for real-time sync
	channel := fmt.Sprintf("notes:%s", update.NotesID.String())
	
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
		s.logger.Error().Err(err).Str("notes_id", update.NotesID.String()).Msg("Failed to publish notes update")
		return err
	}

	// Update CRDT state in database
	if err := s.repo.UpdateCRDTState(ctx, update.NotesID, update.Update, update.UserID); err != nil {
		s.logger.Error().Err(err).Str("notes_id", update.NotesID.String()).Msg("Failed to update CRDT state")
		return err
	}

	s.metrics.IncrementNotesUpdates()
	return nil
}

func (s *NotesService) DeleteNotes(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	notes, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Only allow creator to delete
	if notes.CreatedBy != userID {
		return fmt.Errorf("only creator can delete notes")
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		s.logger.Error().Err(err).Str("notes_id", id.String()).Msg("Failed to delete notes")
		return err
	}

	s.metrics.IncrementNotesDeleted()
	s.logger.Info().Str("notes_id", id.String()).Msg("Notes deleted")

	return nil
}
