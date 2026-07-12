package execution

import (
	"time"

	"github.com/google/uuid"
)

type ExecutionJob struct {
	ID           uuid.UUID  `json:"id"`
	SubmissionID uuid.UUID  `json:"submission_id"`
	Runner       *string    `json:"runner,omitempty"`
	Status       string     `json:"status"`
	StartedAt    *time.Time `json:"started_at,omitempty"`
	FinishedAt   *time.Time `json:"finished_at,omitempty"`
	Stdout       *string    `json:"stdout,omitempty"`
	Stderr       *string    `json:"stderr,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}
