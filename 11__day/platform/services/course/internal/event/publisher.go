package event

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type EventType string

const (
	CourseCreated   EventType = "course.created"
	CourseUpdated   EventType = "course.updated"
	CoursePublished EventType = "course.published"
	CourseDeleted   EventType = "course.deleted"
	StudentEnrolled EventType = "student.enrolled"
)

type Publisher interface {
	Publish(ctx context.Context, eventType EventType, key string, payload interface{}) error
	Close() error
}

type KafkaPublisher struct {
	writer *kafka.Writer
	logger *zap.Logger
}

func NewKafkaPublisher(broker string, topic string, logger *zap.Logger) *KafkaPublisher {
	writer := &kafka.Writer{
		Addr:     kafka.TCP(broker),
		Topic:    topic,
		Balancer: &kafka.LeastBytes{},
		Async:    false,
	}
	return &KafkaPublisher{
		writer: writer,
		logger: logger,
	}
}

func (p *KafkaPublisher) Publish(ctx context.Context, eventType EventType, key string, payload interface{}) error {
	valueBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal event payload: %w", err)
	}

	msg := kafka.Message{
		Key:   []byte(key),
		Value: valueBytes,
	}

	err = p.writer.WriteMessages(ctx, msg)
	if err != nil {
		p.logger.Error("failed to publish kafka message", zap.String("event", string(eventType)), zap.Error(err))
		return fmt.Errorf("failed to write kafka messages: %w", err)
	}

	p.logger.Info("published kafka message successfully", zap.String("event", string(eventType)), zap.String("key", key))
	return nil
}

func (p *KafkaPublisher) Close() error {
	return p.writer.Close()
}

type NoopPublisher struct {
	logger *zap.Logger
}

func NewNoopPublisher(logger *zap.Logger) *NoopPublisher {
	return &NoopPublisher{logger: logger}
}

func (p *NoopPublisher) Publish(ctx context.Context, eventType EventType, key string, payload interface{}) error {
	p.logger.Info("[NOOP EVENT] Event simulated", zap.String("event", string(eventType)), zap.String("key", key))
	return nil
}

func (p *NoopPublisher) Close() error {
	return nil
}
