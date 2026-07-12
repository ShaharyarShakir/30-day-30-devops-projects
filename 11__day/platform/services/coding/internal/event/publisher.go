package event

import (
	"context"
	"fmt"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type Publisher interface {
	Publish(ctx context.Context, event OutboxEvent) error
	Close() error
}

type NoopPublisher struct {
	logger *zap.Logger
}

func NewNoopPublisher(logger *zap.Logger) *NoopPublisher {
	return &NoopPublisher{logger: logger}
}

func (p *NoopPublisher) Publish(ctx context.Context, event OutboxEvent) error {
	p.logger.Debug("NoopPublisher: not publishing event", zap.String("event_type", event.EventType))
	return nil
}

func (p *NoopPublisher) Close() error {
	return nil
}

type KafkaPublisher struct {
	writer *kafka.Writer
	logger *zap.Logger
	topic  string
}

func NewKafkaPublisher(broker, topic string, logger *zap.Logger) *KafkaPublisher {
	return &KafkaPublisher{
		writer: &kafka.Writer{
			Addr:     kafka.TCP(broker),
			Topic:    topic,
			Balancer: &kafka.LeastBytes{},
		},
		logger: logger,
		topic:  topic,
	}
}

func (p *KafkaPublisher) Publish(ctx context.Context, event OutboxEvent) error {
	payload, err := json.Marshal(event.Payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	msg := kafka.Message{
		Key:   []byte(event.AggregateID.String()),
		Value: payload,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte(event.EventType)},
			{Key: "aggregate_type", Value: []byte(event.AggregateType)},
		},
	}

	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		return fmt.Errorf("write kafka message: %w", err)
	}

	p.logger.Debug("published event to kafka", zap.String("event_type", event.EventType))

	return nil
}

func (p *KafkaPublisher) Close() error {
	return p.writer.Close()
}
