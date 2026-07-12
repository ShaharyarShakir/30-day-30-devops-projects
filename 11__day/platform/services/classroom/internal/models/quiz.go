package models

import (
	"time"
	"github.com/google/uuid"
)

type Quiz struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	SessionID    uuid.UUID  `json:"session_id" db:"session_id"`
	Title        string     `json:"title" db:"title"`
	Description  string     `json:"description" db:"description"`
	Questions    string     `json:"questions" db:"questions"` // JSON array
	TimeLimit    *int       `json:"time_limit,omitempty" db:"time_limit"` // minutes
	AllowReview  bool       `json:"allow_review" db:"allow_review"`
	ShowResults  bool       `json:"show_results" db:"show_results"`
	Status       string     `json:"status" db:"status"` // draft, active, completed, archived
	CreatedBy    uuid.UUID  `json:"created_by" db:"created_by"`
	PublishedAt  *time.Time `json:"published_at,omitempty" db:"published_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty" db:"completed_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

type Question struct {
	ID          string      `json:"id"`
	Type        string      `json:"type"` // multiple_choice, true_false, short_answer, code
	 question   string      `json:"question"`
	Options     []Option    `json:"options,omitempty"`
	CorrectAnswer interface{} `json:"correct_answer"` // string for short_answer, array for multiple_choice, bool for true_false
	Points      int         `json:"points"`
	Order       int         `json:"order"`
}

type Option struct {
	ID    string `json:"id"`
	Text  string `json:"text"`
	Order int    `json:"order"`
}

type QuizSubmission struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	QuizID      uuid.UUID  `json:"quiz_id" db:"quiz_id"`
	UserID      uuid.UUID  `json:"user_id" db:"user_id"`
	Answers     string     `json:"answers" db:"answers"` // JSON array
	Score       *float64   `json:"score,omitempty" db:"score"` // percentage
	TimeTaken   *int       `json:"time_taken,omitempty" db:"time_taken"` // seconds
	SubmittedAt time.Time  `json:"submitted_at" db:"submitted_at"`
	GradedAt    *time.Time `json:"graded_at,omitempty" db:"graded_at"`
}

type Answer struct {
	QuestionID string      `json:"question_id"`
	Answer     interface{} `json:"answer"`
}

type QuizResult struct {
	UserID      uuid.UUID `json:"user_id"`
	Score       float64   `json:"score"`
	TimeTaken   int       `json:"time_taken"`
	SubmittedAt time.Time `json:"submitted_at"`
}

type CreateQuizRequest struct {
	SessionID   uuid.UUID  `json:"session_id" validate:"required"`
	Title       string     `json:"title" validate:"required,max=255"`
	Description string     `json:"description" validate:"max=1000"`
	Questions   []Question `json:"questions" validate:"required,min=1"`
	TimeLimit   *int       `json:"time_limit,omitempty" validate:"omitempty,min=1,max=180"`
	AllowReview bool       `json:"allow_review"`
	ShowResults bool       `json:"show_results"`
}

type UpdateQuizRequest struct {
	Title       *string     `json:"title,omitempty" validate:"omitempty,max=255"`
	Description *string     `json:"description,omitempty" validate:"omitempty,max=1000"`
	Questions   *[]Question `json:"questions,omitempty" validate:"omitempty,min=1"`
	TimeLimit   *int        `json:"time_limit,omitempty" validate:"omitempty,min=1,max=180"`
	AllowReview *bool       `json:"allow_review,omitempty"`
	ShowResults *bool       `json:"show_results,omitempty"`
}

type SubmitQuizRequest struct {
	QuizID    uuid.UUID `json:"quiz_id" validate:"required"`
	Answers   []Answer  `json:"answers" validate:"required"`
	TimeTaken int       `json:"time_taken" validate:"required,min=0"`
}

type PublishQuizRequest struct {
	QuizID uuid.UUID `json:"quiz_id" validate:"required"`
}
