package course

import (
	"time"

	"github.com/google/uuid"
	"github.com/platform/services/course/internal/category"
)

type Course struct {
	ID              uuid.UUID           `json:"id"`
	OwnerID         uuid.UUID           `json:"owner_id"`
	Title           string              `json:"title"`
	Slug            string              `json:"slug"`
	Subtitle        *string             `json:"subtitle,omitempty"`
	Description     *string             `json:"description,omitempty"`
	Level           *string             `json:"level,omitempty"`
	Language        *string             `json:"language,omitempty"`
	Price           *float64            `json:"price,omitempty"`
	ThumbnailURL    *string             `json:"thumbnail_url,omitempty"`
	Status          string              `json:"status"`
	Categories      []category.Category `json:"categories,omitempty"`
	Objectives      []string            `json:"objectives,omitempty"`
	Requirements    []string            `json:"requirements,omitempty"`
	TargetAudiences []string            `json:"target_audiences,omitempty"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`
}

type CreateCourseRequest struct {
	Title           string    `json:"title" validate:"required,min=3"`
	Subtitle        *string   `json:"subtitle,omitempty"`
	Description     *string   `json:"description,omitempty"`
	Level           *string   `json:"level,omitempty"`
	Language        *string   `json:"language,omitempty"`
	Price           *float64  `json:"price,omitempty" validate:"omitempty,gte=0"`
	ThumbnailURL    *string   `json:"thumbnail_url,omitempty"`
	CategoryIDs     []string  `json:"category_ids,omitempty"`
	Objectives      []string  `json:"objectives,omitempty"`
	Requirements    []string  `json:"requirements,omitempty"`
	TargetAudiences []string  `json:"target_audiences,omitempty"`
}

type UpdateCourseRequest struct {
	Title           string    `json:"title" validate:"required,min=3"`
	Slug            string    `json:"slug" validate:"required"`
	Subtitle        *string   `json:"subtitle,omitempty"`
	Description     *string   `json:"description,omitempty"`
	Level           *string   `json:"level,omitempty"`
	Language        *string   `json:"language,omitempty"`
	Price           *float64  `json:"price,omitempty" validate:"omitempty,gte=0"`
	ThumbnailURL    *string   `json:"thumbnail_url,omitempty"`
	CategoryIDs     []string  `json:"category_ids,omitempty"`
	Objectives      []string  `json:"objectives,omitempty"`
	Requirements    []string  `json:"requirements,omitempty"`
	TargetAudiences []string  `json:"target_audiences,omitempty"`
	Status          string    `json:"status" validate:"required,oneof=DRAFT UNDER_REVIEW PUBLISHED ARCHIVED"`
}
