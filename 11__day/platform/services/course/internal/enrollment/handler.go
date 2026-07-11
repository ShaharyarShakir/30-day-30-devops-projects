package enrollment

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/platform/services/course/internal/auth"
	"go.uber.org/zap"
)

type Handler struct {
	service *Service
	logger  *zap.Logger
}

func NewHandler(service *Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

func (h *Handler) Enroll(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseIDStr := vars["id"]
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid course ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	enr, err := h.service.Enroll(r.Context(), courseID, userID)
	if err != nil {
		if errors.Is(err, ErrCourseNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrCourseNotPub) || errors.Is(err, ErrAlreadyEnrolled) {
			h.respondError(w, http.StatusBadRequest, err.Error())
		} else {
			h.logger.Error("failed to enroll student", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to enroll student")
		}
		return
	}

	h.respondJSON(w, http.StatusCreated, enr)
}

func (h *Handler) ListMe(w http.ResponseWriter, r *http.Request) {
	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	enrollments, err := h.service.List(r.Context(), userID)
	if err != nil {
		h.logger.Error("failed to list user enrollments", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to list enrollments")
		return
	}

	h.respondJSON(w, http.StatusOK, enrollments)
}

func (h *Handler) CheckEnrollment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseIDStr := vars["id"]
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid course ID")
		return
	}

	userIDStr := vars["userId"]
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	isEnrolled, err := h.service.CheckEnrollment(r.Context(), courseID, userID)
	if err != nil {
		h.logger.Error("failed to check enrollment", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to check enrollment")
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]bool{"enrolled": isEnrolled})
}

func (h *Handler) respondError(w http.ResponseWriter, status int, msg string) {
	h.respondJSON(w, status, map[string]string{"message": msg})
}

func (h *Handler) respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
