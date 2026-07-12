package models

import (
	"time"
	"github.com/google/uuid"
)

type Poll struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	SessionID     uuid.UUID  `json:"session_id" db:"session_id"`
	Question      string     `json:"question" db:"question"`
	Options       string     `json:"options" db:"options"` // JSON array
	AllowMultiple bool       `json:"allow_multiple" db:"allow_multiple"`
	IsAnonymous   bool       `json:"is_anonymous" db:"is_anonymous"`
	Status        string     `json:"status" db:"status"` // draft, active, completed, archived
	CreatedBy     uuid.UUID  `json:"created_by" db:"created_by"`
	PublishedAt   *time.Time `json:"published_at,omitempty" db:"published_at"`
	CompletedAt   *time.Time `json:"completed_at,omitempty" db:"completed_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type PollOption struct {
	ID    string `json:"id"`
	Text  string `json:"text"`
	Order int    `json:"order"`
}

type PollVote struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	PollID    uuid.UUID  `json:"poll_id" db:"poll_id"`
	UserID    uuid.UUID  `json:"user_id" db:"user_id"`
	OptionIDs string     `json:"option_ids" db:"option_ids"` // JSON array
	VotedAt   time.Time  `json:"voted_at" db:"voted_at"`
}

type PollResult struct {
	OptionID    string `json:"option_id"`
	OptionText  string `json:"option_text"`
	VoteCount   int    `json:"vote_count"`
	Percentage  float64 `json:"percentage"`
}

type CreatePollRequest struct {
	SessionID     uuid.UUID     `json:"session_id" validate:"required"`
	Question      string        `json:"question" validate:"required,max=1000"`
	Options       []PollOption  `json:"options" validate:"required,min=2,max=10"`
	AllowMultiple bool          `json:"allow_multiple"`
	IsAnonymous   bool          `json:"is_anonymous"`
}

type UpdatePollRequest struct {
	Question      *string      `json:"question,omitempty" validate:"omitempty,max=1000"`
	Options       *[]PollOption `json:"options,omitempty" validate:"omitempty,min=2,max=10"`
	AllowMultiple *bool        `json:"allow_multiple,omitempty"`
	IsAnonymous   *bool        `json:"is_anonymous,omitempty"`
}

type VoteRequest struct {
	PollID    uuid.UUID `json:"poll_id" validate:"required"`
	OptionIDs []string  `json:"option_ids" validate:"required,min=1"`
}

type PublishPollRequest struct {
	PollID uuid.UUID `json:"poll_id" validate:"required"`
}
