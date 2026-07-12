package submission

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/platform/services/coding/internal/event"
	"github.com/segmentio/kafka-go"
)

var ErrSubmissionNotFound = errors.New("submission not found")

type Service struct {
	repo        Repository
	eventPub    event.Publisher
	kafkaWriter *kafka.Writer
}

func NewService(repo Repository, eventPub event.Publisher, kafkaWriter *kafka.Writer) *Service {
	return &Service{repo: repo, eventPub: eventPub, kafkaWriter: kafkaWriter}
}

func (s *Service) GetByID(ctx context.Context, id string) (*Submission, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	sub, err := s.repo.GetByID(ctx, uid)
	if err != nil {
		return nil, err
	}
	if sub == nil {
		return nil, ErrSubmissionNotFound
	}
	return sub, nil
}

func (s *Service) ListByUser(ctx context.Context, userID string) ([]*Submission, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListByUser(ctx, uid)
}

func (s *Service) ListByProblem(ctx context.Context, problemID string) ([]*Submission, error) {
	uid, err := uuid.Parse(problemID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListByProblem(ctx, uid)
}

func (s *Service) Create(ctx context.Context, userID string, req CreateSubmissionRequest) (*Submission, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	sub, err := s.repo.Create(ctx, uid, req)
	if err != nil {
		return nil, err
	}

	// Send to Kafka for judge service
	eventPayload, _ := json.Marshal(map[string]interface{}{
		"submission_id": sub.ID.String(),
		"problem_id":    sub.ProblemID.String(),
		"language":      sub.Language,
		"code":          sub.Code,
	})
	if err := s.kafkaWriter.WriteMessages(ctx, kafka.Message{
		Key:   []byte(sub.ID.String()),
		Value: eventPayload,
		Time:  time.Now(),
	}); err != nil {
		fmt.Printf("failed to write to kafka: %v", err)
	}

	// Queue outbox event
	_ = s.eventPub.Publish(ctx, event.OutboxEvent{
		AggregateID:   sub.ID,
		AggregateType: "submission",
		EventType:     "submission.created",
		Payload:       map[string]interface{}{"submission_id": sub.ID.String()},
	})

	return sub, nil
}

func (s *Service) UpdateWithResult(ctx context.Context, id string, result ExecutionResult) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}

	score := 0
	if result.Status == "FINISHED" {
		score = 100
	}

	_, err = s.repo.Update(ctx, uid, result.Status, &score, &result.Runtime, &result.Memory)
	if err != nil {
		return err
	}

	return nil
}

func (s *Service) GetResults(ctx context.Context, id string) ([]*SubmissionResult, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	return s.repo.GetResults(ctx, uid)
}
