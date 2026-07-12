package models

import (
	"time"
	"github.com/google/uuid"
)

type HandRaise struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	SessionID     uuid.UUID  `json:"session_id" db:"session_id"`
	UserID        uuid.UUID  `json:"user_id" db:"user_id"`
	Status        string     `json:"status" db:"status"` // pending, approved, rejected, cancelled
	QueuePosition *int       `json:"queue_position,omitempty" db:"queue_position"`
	ApprovedBy    *uuid.UUID `json:"approved_by,omitempty" db:"approved_by"`
	ApprovedAt    *time.Time `json:"approved_at,omitempty" db:"approved_at"`
	RejectedBy    *uuid.UUID `json:"rejected_by,omitempty" db:"rejected_by"`
	RejectedAt    *time.Time `json:"rejected_at,omitempty" db:"rejected_at"`
	RaisedAt      time.Time  `json:"raised_at" db:"raised_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type RaiseHandRequest struct {
	SessionID uuid.UUID `json:"session_id" validate:"required"`
}

type ApproveHandRaiseRequest struct {
	HandRaiseID uuid.UUID `json:"hand_raise_id" validate:"required"`
}

type RejectHandRaiseRequest struct {
	HandRaiseID uuid.UUID `json:"hand_raise_id" validate:"required"`
	Reason      string    `json:"reason,omitempty"`
}

type CancelHandRaiseRequest struct {
	HandRaiseID uuid.UUID `json:"hand_raise_id" validate:"required"`
}
