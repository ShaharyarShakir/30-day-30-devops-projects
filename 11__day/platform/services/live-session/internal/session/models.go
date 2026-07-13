package session

import (
	"time"

	"github.com/google/uuid"
)

type LiveSession struct {
	ID           uuid.UUID  `json:"id"`
	CourseID     uuid.UUID  `json:"course_id"`
	InstructorID uuid.UUID  `json:"instructor_id"`
	Title        string     `json:"title"`
	Description  *string    `json:"description,omitempty"`
	ScheduledAt  *time.Time `json:"scheduled_at,omitempty"`
	StartedAt    *time.Time `json:"started_at,omitempty"`
	EndedAt      *time.Time `json:"ended_at,omitempty"`
	Status       string     `json:"status"` // SCHEDULED, WAITING, LIVE, ENDED, CANCELLED
	CreatedAt    time.Time  `json:"created_at"`
}

type Participant struct {
	ID        uuid.UUID  `json:"id"`
	SessionID uuid.UUID  `json:"session_id"`
	UserID    uuid.UUID  `json:"user_id"`
	Role      string     `json:"role"` // INSTRUCTOR, STUDENT
	JoinedAt  *time.Time `json:"joined_at,omitempty"`
	LeftAt    *time.Time `json:"left_at,omitempty"`
}

type Attendance struct {
	ID        uuid.UUID `json:"id"`
	SessionID uuid.UUID `json:"session_id"`
	UserID    uuid.UUID `json:"user_id"`
	Duration  int       `json:"duration"` // in seconds
}

type CreateSessionRequest struct {
	CourseID    string     `json:"course_id" validate:"required"`
	Title       string     `json:"title" validate:"required,min=3"`
	Description *string    `json:"description,omitempty"`
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
}

type UpdateSessionRequest struct {
	Title       string     `json:"title" validate:"required,min=3"`
	Description *string    `json:"description,omitempty"`
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
}

type SessionTokenResponse struct {
	Token          string `json:"token"`
	LiveKitToken   string `json:"livekit_token"`
	LiveKitURL     string `json:"livekit_url"`
	SessionID      string `json:"session_id"`
	UserID         string `json:"user_id"`
	Role           string `json:"role"`
	Status         string `json:"status"`
}
