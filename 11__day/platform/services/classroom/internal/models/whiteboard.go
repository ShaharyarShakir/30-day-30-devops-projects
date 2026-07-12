package models

import (
	"time"
	"github.com/google/uuid"
)

type Whiteboard struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	SessionID    uuid.UUID  `json:"session_id" db:"session_id"`
	Title        string     `json:"title" db:"title"`
	CRDTState    string     `json:"crdt_state" db:"crdt_state"`
	SnapshotURL  *string    `json:"snapshot_url,omitempty" db:"snapshot_url"`
	IsActive     bool       `json:"is_active" db:"is_active"`
	IsLocked     bool       `json:"is_locked" db:"is_locked"`
	LockedBy     *uuid.UUID `json:"locked_by,omitempty" db:"locked_by"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	LastSnapshotAt *time.Time `json:"last_snapshot_at,omitempty" db:"last_snapshot_at"`
}

type WhiteboardElement struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	WhiteboardID uuid.UUID `json:"whiteboard_id" db:"whiteboard_id"`
	ElementType string    `json:"element_type" db:"element_type"`
	ElementData string    `json:"element_data" db:"element_data"`
	CreatedBy  uuid.UUID  `json:"created_by" db:"created_by"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
}

type CreateWhiteboardRequest struct {
	SessionID uuid.UUID `json:"session_id" validate:"required"`
	Title     string   `json:"title" validate:"required,max=255"`
}

type UpdateWhiteboardRequest struct {
	Title     *string `json:"title,omitempty" validate:"omitempty,max=255"`
	CRDTState *string `json:"crdt_state,omitempty"`
	IsLocked  *bool   `json:"is_locked,omitempty"`
}

type WhiteboardUpdate struct {
	WhiteboardID uuid.UUID `json:"whiteboard_id" validate:"required"`
	Update       string    `json:"update" validate:"required"` // Yjs update
	UserID       uuid.UUID `json:"user_id" validate:"required"`
}

