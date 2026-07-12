package problem

import (
	"time"

	"github.com/google/uuid"
)

type Problem struct {
	ID            uuid.UUID  `json:"id"`
	Title         string     `json:"title"`
	Slug          string     `json:"slug"`
	Difficulty    string     `json:"difficulty"`
	Statement     string     `json:"statement"`
	Constraints   *string    `json:"constraints,omitempty"`
	TimeLimitMs   int        `json:"time_limit_ms"`
	MemoryLimitMb int        `json:"memory_limit_mb"`
	CreatedAt     time.Time  `json:"created_at"`
}

type ProblemLanguage struct {
	ProblemID   uuid.UUID `json:"problem_id"`
	Language    string    `json:"language"`
	StarterCode *string   `json:"starter_code,omitempty"`
}

type TestCase struct {
	ID             uuid.UUID `json:"id"`
	ProblemID      uuid.UUID `json:"problem_id"`
	Input          *string   `json:"input,omitempty"`
	ExpectedOutput *string   `json:"expected_output,omitempty"`
	Hidden         bool      `json:"hidden"`
	Weight         int       `json:"weight"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreateProblemRequest struct {
	Title         string  `json:"title" validate:"required,min=3"`
	Slug          string  `json:"slug" validate:"required"`
	Difficulty    string  `json:"difficulty" validate:"required,oneof=EASY MEDIUM HARD"`
	Statement     string  `json:"statement" validate:"required"`
	Constraints   *string `json:"constraints,omitempty"`
	TimeLimitMs   *int    `json:"time_limit_ms,omitempty"`
	MemoryLimitMb *int    `json:"memory_limit_mb,omitempty"`
}

type UpdateProblemRequest struct {
	Title         string  `json:"title" validate:"required,min=3"`
	Difficulty    string  `json:"difficulty" validate:"required,oneof=EASY MEDIUM HARD"`
	Statement     string  `json:"statement" validate:"required"`
	Constraints   *string `json:"constraints,omitempty"`
	TimeLimitMs   *int    `json:"time_limit_ms,omitempty"`
	MemoryLimitMb *int    `json:"memory_limit_mb,omitempty"`
}
