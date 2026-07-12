package result

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/platform/services/coding/internal/database"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type testCaseResult struct {
	TestCaseID string `json:"test_case_id"`
	Status     string `json:"status"`
	Runtime    int64  `json:"runtime"`
	Memory     int64  `json:"memory"`
	Stdout     string `json:"stdout"`
	Stderr     string `json:"stderr"`
}

type completionEvent struct {
	SubmissionID    string           `json:"submission_id"`
	Status          string           `json:"status"`
	Score           int              `json:"score"`
	Runtime         int64            `json:"runtime"`
	Memory          int64            `json:"memory"`
	TestCaseResults []testCaseResult `json:"test_case_results"`
}

type Consumer struct {
	reader *kafka.Reader
	db     *pgxpool.Pool
	q      *database.Queries
	logger *zap.Logger
}

func NewConsumer(brokers []string, topic string, db *pgxpool.Pool, q *database.Queries, logger *zap.Logger) *Consumer {
	return &Consumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers: brokers,
			Topic:   topic,
			GroupID: "coding-result-consumer",
		}),
		db:     db,
		q:      q,
		logger: logger,
	}
}

func (c *Consumer) Run(ctx context.Context) {
	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			c.logger.Error("read result message", zap.Error(err))
			continue
		}

		var event completionEvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			c.logger.Error("unmarshal result event", zap.Error(err))
			continue
		}

		if err := c.handle(ctx, event); err != nil {
			c.logger.Error("handle result event",
				zap.String("submission_id", event.SubmissionID),
				zap.Error(err),
			)
		}
	}
}

func (c *Consumer) Close() {
	c.reader.Close()
}

func (c *Consumer) handle(ctx context.Context, event completionEvent) error {
	submissionID, err := uuid.Parse(event.SubmissionID)
	if err != nil {
		return err
	}

	// Store per-test-case results
	for _, tcr := range event.TestCaseResults {
		tcID, err := uuid.Parse(tcr.TestCaseID)
		if err != nil {
			c.logger.Warn("invalid test_case_id", zap.String("id", tcr.TestCaseID))
			continue
		}
		_, err = c.q.CreateSubmissionResult(ctx, database.CreateSubmissionResultParams{
			SubmissionID: submissionID,
			TestCaseID:   tcID,
			Runtime:      sql.NullInt64{Int64: tcr.Runtime, Valid: true},
			Memory:       sql.NullInt64{Int64: tcr.Memory, Valid: true},
			Status:       tcr.Status,
			Stdout:       sql.NullString{String: tcr.Stdout, Valid: tcr.Stdout != ""},
			Stderr:       sql.NullString{String: tcr.Stderr, Valid: tcr.Stderr != ""},
		})
		if err != nil {
			c.logger.Warn("store test case result", zap.Error(err))
		}
	}

	// Update submission with final verdict
	score := sql.NullInt32{Int32: int32(event.Score), Valid: true}
	runtime := sql.NullInt64{Int64: event.Runtime, Valid: true}
	memory := sql.NullInt64{Int64: event.Memory, Valid: true}

	_, err = c.q.UpdateSubmission(ctx, database.UpdateSubmissionParams{
		ID:      submissionID,
		Status:  event.Status,
		Score:   score,
		Runtime: runtime,
		Memory:  memory,
	})
	if err != nil {
		return err
	}

	c.logger.Info("submission result stored",
		zap.String("submission_id", event.SubmissionID),
		zap.String("status", event.Status),
		zap.Int("score", event.Score),
	)
	return nil
}
