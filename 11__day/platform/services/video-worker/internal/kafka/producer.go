package kafka

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/IBM/sarama"
	"go.uber.org/zap"
)

type ProcessingProgressEvent struct {
	MediaID   string `json:"mediaId"`
	Progress  int    `json:"progress"`
	Message   string `json:"message,omitempty"`
}

type ProcessingFinishedEvent struct {
	MediaID   string  `json:"mediaId"`
	Duration  float64 `json:"duration"`
	Playlist  string  `json:"playlist"`
	Width     int     `json:"width"`
	Height    int     `json:"height"`
	Codec     string  `json:"codec"`
	Bitrate   int     `json:"bitrate"`
	FrameRate float64 `json:"frameRate"`
}

type ProcessingFailedEvent struct {
	MediaID string `json:"mediaId"`
	Error   string `json:"error"`
}

type Producer struct {
	producer sarama.SyncProducer
	topics   map[string]string
	logger   *zap.Logger
}

func NewProducer(brokers []string, topics map[string]string, logger *zap.Logger) (*Producer, error) {
	config := sarama.NewConfig()
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Retry.Max = 5
	config.Producer.Return.Successes = true

	producer, err := sarama.NewSyncProducer(brokers, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create producer: %w", err)
	}

	return &Producer{
		producer: producer,
		topics:   topics,
		logger:   logger,
	}, nil
}

func (p *Producer) Close() error {
	return p.producer.Close()
}

func (p *Producer) PublishProgress(ctx context.Context, event *ProcessingProgressEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal progress event: %w", err)
	}

	msg := &sarama.ProducerMessage{
		Topic: p.topics["processing_progress"],
		Value: sarama.ByteEncoder(data),
	}

	if _, _, err := p.producer.SendMessage(msg); err != nil {
		return fmt.Errorf("failed to send progress event: %w", err)
	}

	p.logger.Debug("Published progress event",
		zap.String("media_id", event.MediaID),
		zap.Int("progress", event.Progress),
	)

	return nil
}

func (p *Producer) PublishFinished(ctx context.Context, event *ProcessingFinishedEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal finished event: %w", err)
	}

	msg := &sarama.ProducerMessage{
		Topic: p.topics["processing_finished"],
		Value: sarama.ByteEncoder(data),
	}

	if _, _, err := p.producer.SendMessage(msg); err != nil {
		return fmt.Errorf("failed to send finished event: %w", err)
	}

	p.logger.Info("Published finished event",
		zap.String("media_id", event.MediaID),
		zap.String("playlist", event.Playlist),
	)

	return nil
}

func (p *Producer) PublishFailed(ctx context.Context, event *ProcessingFailedEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal failed event: %w", err)
	}

	msg := &sarama.ProducerMessage{
		Topic: p.topics["processing_failed"],
		Value: sarama.ByteEncoder(data),
	}

	if _, _, err := p.producer.SendMessage(msg); err != nil {
		return fmt.Errorf("failed to send failed event: %w", err)
	}

	p.logger.Error("Published failed event",
		zap.String("media_id", event.MediaID),
		zap.String("error", event.Error),
	)

	return nil
}
