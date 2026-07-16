package kafka

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/IBM/sarama"
	"go.uber.org/zap"
)

type UploadCompletedEvent struct {
	MediaID    string `json:"mediaId"`
	StorageKey string `json:"storageKey"`
	OwnerID    string `json:"ownerId"`
}

type Consumer struct {
	config   *sarama.Config
	brokers  []string
	group    string
	topics   map[string]string
	handler  func(context.Context, *UploadCompletedEvent) error
	logger   *zap.Logger
}

func NewConsumer(brokers []string, group string, topics map[string]string, logger *zap.Logger) (*Consumer, error) {
	config := sarama.NewConfig()
	config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
	config.Consumer.Offsets.Initial = sarama.OffsetNewest
	config.Consumer.Return.Errors = true

	return &Consumer{
		config:  config,
		brokers: brokers,
		group:   group,
		topics:  topics,
		logger:  logger,
	}, nil
}

func (c *Consumer) SetHandler(handler func(context.Context, *UploadCompletedEvent) error) {
	c.handler = handler
}

func (c *Consumer) Start(ctx context.Context) error {
	consumerGroup, err := sarama.NewConsumerGroup(c.brokers, c.group, c.config)
	if err != nil {
		return fmt.Errorf("failed to create consumer group: %w", err)
	}
	defer consumerGroup.Close()

	c.logger.Info("Starting Kafka consumer",
		zap.Strings("brokers", c.brokers),
		zap.String("group", c.group),
		zap.String("topic", c.topics["upload_completed"]),
	)

	handler := &groupHandler{
		consumer: c,
		ctx:      ctx,
	}

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("Context cancelled, stopping consumer")
			return ctx.Err()
		default:
			if err := consumerGroup.Consume(ctx, []string{c.topics["upload_completed"]}, handler); err != nil {
				c.logger.Error("Error from consumer", zap.Error(err))
			}
		}
	}
}

type groupHandler struct {
	consumer *Consumer
	ctx      context.Context
}

func (h *groupHandler) Setup(sarama.ConsumerGroupSession) error {
	return nil
}

func (h *groupHandler) Cleanup(sarama.ConsumerGroupSession) error {
	return nil
}

func (h *groupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for message := range claim.Messages() {
		var event UploadCompletedEvent
		if err := json.Unmarshal(message.Value, &event); err != nil {
			h.consumer.logger.Error("Failed to unmarshal message",
				zap.String("topic", message.Topic),
				zap.Int32("partition", message.Partition),
				zap.Int64("offset", message.Offset),
				zap.Error(err),
			)
			continue
		}

		h.consumer.logger.Info("Processing upload completed event",
			zap.String("media_id", event.MediaID),
			zap.String("storage_key", event.StorageKey),
		)

		if err := h.consumer.handler(h.ctx, &event); err != nil {
			h.consumer.logger.Error("Handler failed",
				zap.String("media_id", event.MediaID),
				zap.Error(err),
			)
		} else {
			session.MarkMessage(message, "")
		}
	}
	return nil
}
