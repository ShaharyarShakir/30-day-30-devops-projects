package event

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/platform/services/course/internal/database"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

// EventEnvelope defines the enterprise-wide standard outer format for Kafka events.
type EventEnvelope struct {
	EventID       uuid.UUID   `json:"eventId"`
	EventType     string      `json:"eventType"`
	Version       int         `json:"version"`
	OccurredAt    time.Time   `json:"occurredAt"`
	Source        string      `json:"source"`
	TraceID       string      `json:"traceId,omitempty"`
	SpanID        string      `json:"spanId,omitempty"`
	CorrelationID string      `json:"correlationId,omitempty"`
	Data          interface{} `json:"data"`
}

// QueueOutboxEvent writes an event envelope to the outbox_events table in a transactional context.
func QueueOutboxEvent(ctx context.Context, qtx *database.Queries, aggregateID uuid.UUID, aggregateType string, eventType string, data interface{}) error {
	envelopeID := uuid.New()
	
	// Trace metadata propagation
	traceID, spanID := getTraceMetadata(ctx)
	correlationID := rHeader(ctx, "X-Request-Id")

	envelope := EventEnvelope{
		EventID:       envelopeID,
		EventType:     eventType,
		Version:       1,
		OccurredAt:    time.Now(),
		Source:        "course-service",
		TraceID:       traceID,
		SpanID:        spanID,
		CorrelationID: correlationID,
		Data:          data,
	}

	payloadBytes, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("failed to marshal outbox event envelope: %w", err)
	}

	err = qtx.InsertOutboxEvent(ctx, database.InsertOutboxEventParams{
		ID:            database.UUIDToPg(envelopeID),
		AggregateID:   database.UUIDToPg(aggregateID),
		AggregateType: database.StringPtrToPg(&aggregateType),
		EventType:     database.StringPtrToPg(&eventType),
		Payload:       payloadBytes,
		CreatedAt:     database.TimeToPg(time.Now()),
	})
	if err != nil {
		return fmt.Errorf("failed to insert outbox event: %w", err)
	}

	return nil
}

// OutboxPublisher background worker that polls Postgres and publishes to Kafka.
type OutboxPublisher struct {
	pool      *pgxpool.Pool
	queries   *database.Queries
	publisher Publisher
	logger    *zap.Logger
}

func NewOutboxPublisher(pool *pgxpool.Pool, queries *database.Queries, publisher Publisher, logger *zap.Logger) *OutboxPublisher {
	return &OutboxPublisher{
		pool:      pool,
		queries:   queries,
		publisher: publisher,
		logger:    logger,
	}
}

// Start runs the polling worker loop.
func (op *OutboxPublisher) Start(ctx context.Context) {
	op.logger.Info("Starting transactional outbox background publisher loop...")
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			op.logger.Info("Stopping outbox background publisher...")
			return
		case <-ticker.C:
			if err := op.PublishPendingEvents(ctx); err != nil {
				op.logger.Error("Error publishing outbox events", zap.Error(err))
			}
		}
	}
}

// PublishPendingEvents queries, publishes and marks outbox events as published.
func (op *OutboxPublisher) PublishPendingEvents(ctx context.Context) error {
	// Query up to 100 unpublished events
	dbEvents, err := op.queries.ListUnpublishedOutboxEvents(ctx, 100)
	if err != nil {
		return fmt.Errorf("failed to query unpublished outbox events: %w", err)
	}

	if len(dbEvents) == 0 {
		return nil
	}

	op.logger.Debug("Found pending outbox events to publish", zap.Int("count", len(dbEvents)))

	for _, dbEv := range dbEvents {
		aggID := database.PgToUUID(dbEv.AggregateID)
		evtType := ""
		if dbEv.EventType.Valid {
			evtType = dbEv.EventType.String
		}

		op.logger.Info("Processing outbox event", zap.String("id", database.PgToUUID(dbEv.ID).String()), zap.String("type", evtType))

		// Construct corporate envelope
		var envelope EventEnvelope
		if err := json.Unmarshal(dbEv.Payload, &envelope); err != nil {
			op.logger.Error("failed to unmarshal outbox envelope from payload database, skipping", zap.Error(err))
			continue
		}

		// Publish to Kafka (via publisher interface)
		err = op.publisher.Publish(ctx, EventType(evtType), aggID.String(), envelope)
		if err != nil {
			op.logger.Error("failed to publish outbox event to kafka, will retry", zap.String("id", envelope.EventID.String()), zap.Error(err))
			// Stop batch processing on Kafka errors to maintain ordering
			return err
		}

		// Mark as published in Database
		err = op.queries.MarkOutboxEventAsPublished(ctx, database.MarkOutboxEventAsPublishedParams{
			ID: dbEv.ID,
			PublishedAt: pgtype.Timestamp{
				Time:  time.Now(),
				Valid: true,
			},
		})
		if err != nil {
			op.logger.Error("failed to mark outbox event as published in database", zap.String("id", envelope.EventID.String()), zap.Error(err))
			return err
		}
	}

	return nil
}

func getTraceMetadata(ctx context.Context) (traceID, spanID string) {
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		traceID = span.SpanContext().TraceID().String()
		spanID = span.SpanContext().SpanID().String()
	}
	return
}

func rHeader(ctx context.Context, header string) string {
	// A simple request-id context helper if needed, else returns empty
	return ""
}
