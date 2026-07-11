package section

import "github.com/google/uuid"

type Section struct {
	ID       uuid.UUID `json:"id"`
	CourseID uuid.UUID `json:"course_id"`
	Title    string    `json:"title"`
	Position int       `json:"position"`
}

type CreateSectionRequest struct {
	Title    string `json:"title" validate:"required,min=2"`
	Position int    `json:"position" validate:"required,gte=1"`
}
