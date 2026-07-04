package handlers

import (
	"github.com/ShaharyarShakir/url-shortener/internal/storage"
)

// Handler holds dependencies for HTTP route handlers.
type Handler struct {
	DB *storage.Postgres
}

// NewHandler creates a new Handler instance.
func NewHandler(db *storage.Postgres) *Handler {
	return &Handler{
		DB: db,
	}
}
