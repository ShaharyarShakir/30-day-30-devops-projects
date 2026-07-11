package lesson

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/platform/services/course/internal/auth"
	"go.uber.org/zap"
)

type Handler struct {
	service   *Service
	validator *validator.Validate
	logger    *zap.Logger
}

func NewHandler(service *Service, logger *zap.Logger) *Handler {
	return &Handler{
		service:   service,
		validator: validator.New(),
		logger:    logger,
	}
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	if !auth.IsInstructorOrAdmin(r.Context()) {
		h.respondError(w, http.StatusForbidden, "Only instructors or admins can add lessons")
		return
	}

	vars := mux.Vars(r)
	sectionIDStr := vars["id"]
	sectionID, err := uuid.Parse(sectionIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid section ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	isAdmin := auth.HasRole(r.Context(), "admin")

	var req CreateLessonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	l, err := h.service.Create(r.Context(), sectionID, userID, isAdmin, req)
	if err != nil {
		if errors.Is(err, ErrSectionNotFound) || errors.Is(err, ErrCourseNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else if errors.Is(err, ErrCannotEdit) {
			h.respondError(w, http.StatusBadRequest, err.Error())
		} else {
			h.logger.Error("failed to create lesson", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to create lesson")
		}
		return
	}

	h.respondJSON(w, http.StatusCreated, l)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	if !auth.IsInstructorOrAdmin(r.Context()) {
		h.respondError(w, http.StatusForbidden, "Only instructors or admins can edit lessons")
		return
	}

	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid lesson ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	isAdmin := auth.HasRole(r.Context(), "admin")

	var req CreateLessonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	l, err := h.service.Update(r.Context(), id, userID, isAdmin, req)
	if err != nil {
		if errors.Is(err, ErrSectionNotFound) || errors.Is(err, ErrCourseNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else if errors.Is(err, ErrCannotEdit) {
			h.respondError(w, http.StatusBadRequest, err.Error())
		} else {
			h.logger.Error("failed to update lesson", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to update lesson")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, l)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	if !auth.IsInstructorOrAdmin(r.Context()) {
		h.respondError(w, http.StatusForbidden, "Only instructors or admins can delete lessons")
		return
	}

	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid lesson ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	isAdmin := auth.HasRole(r.Context(), "admin")

	err = h.service.Delete(r.Context(), id, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrSectionNotFound) || errors.Is(err, ErrCourseNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else if errors.Is(err, ErrCannotEdit) {
			h.respondError(w, http.StatusBadRequest, err.Error())
		} else {
			h.logger.Error("failed to delete lesson", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to delete lesson")
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) respondError(w http.ResponseWriter, status int, msg string) {
	h.respondJSON(w, status, map[string]string{"message": msg})
}

func (h *Handler) respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
