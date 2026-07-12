package models

import (
	"time"
	"github.com/google/uuid"
)

type SharedNotes struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	SessionID     uuid.UUID  `json:"session_id" db:"session_id"`
	Title         string     `json:"title" db:"title"`
	Content       string     `json:"content" db:"content"`
	CRDTState     *string    `json:"crdt_state,omitempty" db:"crdt_state"`
	IsPublic      bool       `json:"is_public" db:"is_public"`
	CreatedBy     uuid.UUID  `json:"created_by" db:"created_by"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
	LastEditedBy  *uuid.UUID `json:"last_edited_by,omitempty" db:"last_edited_by"`
	LastEditedAt  *time.Time `json:"last_edited_at,omitempty" db:"last_edited_at"`
}

type CreateNotesRequest struct {
	SessionID uuid.UUID `json:"session_id" validate:"required"`
	Title     string   `json:"title" validate:"required,max=255"`
	Content   string   `json:"content" validate:"required"`
	IsPublic  bool     `json:"is_public"`
}

type UpdateNotesRequest struct {
	Title    *string `json:"title,omitempty" validate:"omitempty,max=255"`
	Content  *string `json:"content,omitempty"`
	CRDTState *string `json:"crdt_state,omitempty"`
	IsPublic *bool   `json:"is_public,omitempty"`
}

type NotesUpdate struct {
	NotesID uuid.UUID `json:"notes_id" validate:"required"`
	Update  string   `json:"update" validate:"required"` // Yjs update
	UserID  uuid.UUID `json:"user_id" validate:"required"`
}
