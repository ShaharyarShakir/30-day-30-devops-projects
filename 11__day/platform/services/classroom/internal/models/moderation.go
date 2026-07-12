package models

import (
	"time"
	"github.com/google/uuid"
)

type ModerationAction struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	SessionID   uuid.UUID  `json:"session_id" db:"session_id"`
	ActionType  string     `json:"action_type" db:"action_type"` // mute, remove, disable_chat, lock_whiteboard, end_poll, pin_screen
	TargetUserID *uuid.UUID `json:"target_user_id,omitempty" db:"target_user_id"`
	PerformedBy uuid.UUID  `json:"performed_by" db:"performed_by"`
	Reason      string     `json:"reason,omitempty" db:"reason"`
	ActionData  string     `json:"action_data,omitempty" db:"action_data"` // JSON
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
}

type UserSessionState struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	SessionID      uuid.UUID  `json:"session_id" db:"session_id"`
	UserID         uuid.UUID  `json:"user_id" db:"user_id"`
	IsMuted        bool       `json:"is_muted" db:"is_muted"`
	IsChatDisabled bool       `json:"is_chat_disabled" db:"is_chat_disabled"`
	IsVideoDisabled bool      `json:"is_video_disabled" db:"is_video_disabled"`
	CanSpeak       bool       `json:"can_speak" db:"can_speak"`
	Metadata       string     `json:"metadata,omitempty" db:"metadata"` // JSON
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

type MuteUserRequest struct {
	SessionID   uuid.UUID `json:"session_id" validate:"required"`
	UserID      uuid.UUID `json:"user_id" validate:"required"`
	IsMuted     bool      `json:"is_muted" validate:"required"`
	Reason      string    `json:"reason,omitempty"`
}

type DisableChatRequest struct {
	SessionID       uuid.UUID `json:"session_id" validate:"required"`
	UserID          uuid.UUID `json:"user_id" validate:"required"`
	IsChatDisabled  bool      `json:"is_chat_disabled" validate:"required"`
	Reason          string    `json:"reason,omitempty"`
}

type RemoveUserRequest struct {
	SessionID uuid.UUID `json:"session_id" validate:"required"`
	UserID    uuid.UUID `json:"user_id" validate:"required"`
	Reason    string    `json:"reason,omitempty"`
}

type LockWhiteboardRequest struct {
	SessionID    uuid.UUID `json:"session_id" validate:"required"`
	WhiteboardID uuid.UUID `json:"whiteboard_id" validate:"required"`
	Lock         bool      `json:"lock"`
	Reason       string    `json:"reason,omitempty"`
}

type EndPollRequest struct {
	SessionID uuid.UUID `json:"session_id" validate:"required"`
	PollID    uuid.UUID `json:"poll_id" validate:"required"`
	Reason    string    `json:"reason,omitempty"`
}
