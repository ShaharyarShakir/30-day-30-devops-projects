package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/platform/services/judge/internal/evaluator"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type submissionEvent struct {
	SubmissionID string `json:"submission_id"`
	ProblemID    string `json:"problem_id"`
	Language     string `json:"language"`
	Code         string `json:"code"`
}

type testCaseResponse struct {
	ID             string `json:"id"`
	Input          *string `json:"input"`
	ExpectedOutput *string `json:"expected_output"`
	Hidden         bool    `json:"hidden"`
	Weight         int     `json:"weight"`
}

type problemResponse struct {
	TimeLimitMs   int `json:"time_limit_ms"`
	MemoryLimitMb int `json:"memory_limit_mb"`
}

type testCaseResult struct {
	TestCaseID string `json:"test_case_id"`
	Status     string `json:"status"`
	Runtime    int64  `json:"runtime"`
	Memory     int64  `json:"memory"`
	Stdout     string `json:"stdout,omitempty"`
	Stderr     string `json:"stderr,omitempty"`
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
	reader      *kafka.Reader
	writer      *kafka.Writer
	eval        *evaluator.Evaluator
	codingURL   string
	logger      *zap.Logger
}

func New(brokers []string, requestTopic, resultTopic, codingURL string, eval *evaluator.Evaluator, logger *zap.Logger) *Consumer {
	return &Consumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers: brokers,
			Topic:   requestTopic,
			GroupID: "judge-service",
		}),
		writer: &kafka.Writer{
			Addr:     kafka.TCP(brokers...),
			Topic:    resultTopic,
			Balancer: &kafka.LeastBytes{},
		},
		eval:      eval,
		codingURL: codingURL,
		logger:    logger,
	}
}

func (c *Consumer) Run(ctx context.Context) {
	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			c.logger.Error("read message", zap.Error(err))
			continue
		}

		var event submissionEvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			c.logger.Error("unmarshal event", zap.Error(err))
			continue
		}

		c.logger.Info("processing submission", zap.String("submission_id", event.SubmissionID))
		go c.process(ctx, event)
	}
}

func (c *Consumer) Close() {
	c.reader.Close()
	c.writer.Close()
}

func (c *Consumer) process(ctx context.Context, event submissionEvent) {
	problem, err := c.fetchProblem(event.ProblemID)
	if err != nil {
		c.logger.Error("fetch problem", zap.Error(err))
		c.publishError(ctx, event.SubmissionID, evaluator.VerdictSystemError)
		return
	}

	testCases, err := c.fetchTestCases(event.ProblemID)
	if err != nil {
		c.logger.Error("fetch test cases", zap.Error(err))
		c.publishError(ctx, event.SubmissionID, evaluator.VerdictSystemError)
		return
	}

	evalCases := make([]evaluator.TestCase, len(testCases))
	for i, tc := range testCases {
		evalCases[i] = evaluator.TestCase{
			ID:     tc.ID,
			Hidden: tc.Hidden,
			Weight: tc.Weight,
		}
		if tc.Input != nil {
			evalCases[i].Input = *tc.Input
		}
		if tc.ExpectedOutput != nil {
			evalCases[i].ExpectedOutput = *tc.ExpectedOutput
		}
	}

	result := c.eval.Evaluate(ctx, event.Language, event.Code, evalCases,
		int64(problem.TimeLimitMs), int64(problem.MemoryLimitMb))

	tcResults := make([]testCaseResult, len(result.TestCaseResults))
	for i, r := range result.TestCaseResults {
		tcResults[i] = testCaseResult{
			TestCaseID: r.TestCaseID,
			Status:     r.Status,
			Runtime:    r.Runtime,
			Memory:     r.Memory,
			Stdout:     r.Stdout,
			Stderr:     r.Stderr,
		}
	}

	payload, _ := json.Marshal(completionEvent{
		SubmissionID:    event.SubmissionID,
		Status:          result.Status,
		Score:           result.Score,
		Runtime:         result.Runtime,
		Memory:          result.Memory,
		TestCaseResults: tcResults,
	})

	if err := c.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(event.SubmissionID),
		Value: payload,
		Time:  time.Now(),
	}); err != nil {
		c.logger.Error("publish result", zap.Error(err))
	}

	c.logger.Info("submission evaluated",
		zap.String("submission_id", event.SubmissionID),
		zap.String("status", result.Status),
		zap.Int("score", result.Score),
	)
}

func (c *Consumer) publishError(ctx context.Context, submissionID, status string) {
	payload, _ := json.Marshal(completionEvent{SubmissionID: submissionID, Status: status})
	c.writer.WriteMessages(ctx, kafka.Message{ //nolint
		Key:   []byte(submissionID),
		Value: payload,
		Time:  time.Now(),
	})
}

func (c *Consumer) fetchProblem(problemID string) (*problemResponse, error) {
	resp, err := http.Get(fmt.Sprintf("%s/internal/problems/%s", c.codingURL, problemID))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var p problemResponse
	return &p, json.Unmarshal(body, &p)
}

func (c *Consumer) fetchTestCases(problemID string) ([]testCaseResponse, error) {
	resp, err := http.Get(fmt.Sprintf("%s/internal/problems/%s/test-cases", c.codingURL, problemID))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var tcs []testCaseResponse
	return tcs, json.Unmarshal(body, &tcs)
}
