package lesson

import "github.com/google/uuid"

type Lesson struct {
	ID        uuid.UUID `json:"id"`
	SectionID uuid.UUID `json:"section_id"`
	Title     string    `json:"title"`
	Type      string    `json:"type"` // VIDEO, ARTICLE, QUIZ, LIVE, CODING
	Duration  *int      `json:"duration,omitempty"`
	Position  *int      `json:"position,omitempty"`
}

type CreateLessonRequest struct {
	Title    string `json:"title" validate:"required,min=2"`
	Type     string `json:"type" validate:"required,oneof=VIDEO ARTICLE QUIZ LIVE CODING"`
	Duration *int   `json:"duration,omitempty" validate:"omitempty,gte=0"`
	Position *int   `json:"position,omitempty" validate:"omitempty,gte=1"`
}
