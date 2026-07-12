package submission

import (
	"time"

	"github.com/google/uuid"
)

type Submission struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	ProblemID uuid.UUID `json:"problem_id"`
	Language  string    `json:"language"`
	Status    string    `json:"status"`
	Score     *int      `json:"score,omitempty"`
	Runtime   *int64    `json:"runtime,omitempty"`
	Memory    *int64    `json:"memory,omitempty"`
	Code      string    `json:"code"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateSubmissionRequest struct {
	ProblemID string `json:"problem_id" validate:"required,uuid"`
	Language  string `json:"language" validate:"required"`
	Code      string `json:"code" validate:"required"`
}

type ExecutionResult struct {
	Status  string `json:"status"`
	Stdout  string `json:"stdout"`
	Stderr  string `json:"stderr"`
	Runtime int64  `json:"runtime"`
	Memory  int64  `json:"memory"`
}

type SubmissionResult struct {
	SubmissionID uuid.UUID `json:"submission_id"`
	TestCaseID   uuid.UUID `json:"test_case_id"`
	Runtime      *int64    `json:"runtime,omitempty"`
	Memory       *int64    `json:"memory,omitempty"`
	Status       string    `json:"status"`
	Stdout       *string   `json:"stdout,omitempty"`
	Stderr       *string   `json:"stderr,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}
