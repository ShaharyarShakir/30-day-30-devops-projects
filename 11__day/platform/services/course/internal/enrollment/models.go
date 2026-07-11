package enrollment

import (
	"time"

	"github.com/google/uuid"
)

type Enrollment struct {
	ID                 uuid.UUID `json:"id"`
	CourseID           uuid.UUID `json:"course_id"`
	UserID             uuid.UUID `json:"user_id"`
	EnrolledAt         time.Time `json:"enrolled_at"`
	CourseTitle        string    `json:"course_title,omitempty"`
	CourseSlug         string    `json:"course_slug,omitempty"`
	CourseThumbnailURL *string   `json:"course_thumbnail_url,omitempty"`
}
