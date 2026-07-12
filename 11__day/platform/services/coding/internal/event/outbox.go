package event

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/platform/services/coding/internal/database"
	"go.uber.org/zap"
)

type OutboxEvent struct {
	ID            uuid.UUID
	AggregateID   uuid.UUID
	AggregateType string
	EventType     string
	Payload       map[string]interface{}
	CreatedAt     time.Time
	ProcessedAt   *time.Time
}

func QueueOutboxEvent(ctx context.Context, q *database.Queries, aggregateID uuid.UUID, aggregateType, eventType string, payload map[string]interface{}) error {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	_, err = q.CreateOutboxEvent(ctx, database.CreateOutboxEventParams{
		ID:            database.UUIDToPg(uuid.New()),
		AggregateID:   database.UUIDToPg(aggregateID),
		AggregateType: aggregateType,
		EventType:     eventType,
		Payload:       payloadJSON,
	})
	return err
}

type OutboxWorker struct {
	db      *pgxpool.Pool
	q       *database.Queries
	pub     Publisher
	logger  *zap.Logger
	ctx     context.Context
	cancel  func()
}

func NewOutboxWorker(db *pgxpool.Pool, q *database.Queries, pub Publisher, logger *zap.Logger) *OutboxWorker {
	ctx, cancel := context.WithCancel(context.Background())
	return &OutboxWorker{
		db:     db,
		q:      q,
		pub:    pub,
		logger: logger,
		ctx:    ctx,
		cancel: cancel,
	}
}

func (w *OutboxWorker) Start() {
	go w.run()
}

func (w *OutboxWorker) Stop() {
	w.cancel()
}

func (w *OutboxWorker) run() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-w.ctx.Done():
			return
		case <-ticker.C:
			if err := w.processBatch(); err != nil {
				w.logger.Error("failed to process outbox batch", zap.Error(err))
			}
		}
	}
}

func (w *OutboxWorker) processBatch() error {
	ctx := context.Background()

	dbEvents, err := w.q.ListPendingOutboxEvents(ctx)
	if err != nil {
		return fmt.Errorf("list pending events: %w", err)
	}

	for _, dbEvent := range dbEvents {
		var payload map[string]interface{}
		if err := json.Unmarshal(dbEvent.Payload, &payload); err != nil {
			w.logger.Error("failed to unmarshal payload", zap.String("event_id", database.PgToUUID(dbEvent.ID).String()), zap.Error(err))
			continue
		}

		event := OutboxEvent{
			ID:            database.PgToUUID(dbEvent.ID),
			AggregateID:   database.PgToUUID(dbEvent.AggregateID),
			AggregateType: dbEvent.AggregateType,
			EventType:     dbEvent.EventType,
			Payload:       payload,
			CreatedAt:     database.PgToTime(dbEvent.CreatedAt),
		}

		if err := w.pub.Publish(ctx, event); err != nil {
			w.logger.Error("failed to publish event", zap.String("event_id", event.ID.String()), zap.Error(err))
			continue
		}

		if err := w.q.MarkOutboxEventAsProcessed(ctx, database.MarkOutboxEventAsProcessedParams{
			ID:          database.UUIDToPg(event.ID),
			ProcessedAt: database.TimeToPg(time.Now()),
		}); err != nil {
			w.logger.Error("failed to mark event as processed", zap.String("event_id", event.ID.String()), zap.Error(err))
		}
	}

	return nil
}
