package course

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
	// Only instructors or admins can create courses
	if !auth.IsInstructorOrAdmin(r.Context()) {
		h.respondError(w, http.StatusForbidden, "Only instructors or admins can create courses")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	var req CreateCourseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	c, err := h.service.Create(r.Context(), userID, req)
	if err != nil {
		h.logger.Error("failed to create course", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to create course")
		return
	}

	h.respondJSON(w, http.StatusCreated, c)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
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

	isAdmin := auth.HasRole(r.Context(), "admin")

	var req UpdateCourseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	c, err := h.service.Update(r.Context(), courseID, userID, isAdmin, req)
	if err != nil {
		if errors.Is(err, ErrCourseNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else if errors.Is(err, ErrCannotEdit) {
			h.respondError(w, http.StatusBadRequest, err.Error())
		} else {
			h.logger.Error("failed to update course", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to update course")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, c)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
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

	isAdmin := auth.HasRole(r.Context(), "admin")

	err = h.service.Delete(r.Context(), courseID, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrCourseNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else {
			h.logger.Error("failed to delete course", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to delete course")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Course deleted successfully"})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	identifier := vars["id"]

	userIDStr := auth.GetUserID(r.Context())
	userID, _ := uuid.Parse(userIDStr)
	isAdmin := auth.HasRole(r.Context(), "admin")

	c, err := h.service.Get(r.Context(), identifier, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrCourseNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else {
			h.logger.Error("failed to get course", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to retrieve course")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, c)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userIDStr := auth.GetUserID(r.Context())
	userID, _ := uuid.Parse(userIDStr)
	isAdmin := auth.HasRole(r.Context(), "admin")
	isInstructor := auth.HasRole(r.Context(), "instructor")

	courses, err := h.service.List(r.Context(), userID, isAdmin, isInstructor)
	if err != nil {
		h.logger.Error("failed to list courses", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to list courses")
		return
	}

	h.respondJSON(w, http.StatusOK, courses)
}

func (h *Handler) Publish(w http.ResponseWriter, r *http.Request) {
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

	isAdmin := auth.HasRole(r.Context(), "admin")

	c, vResp, err := h.service.Publish(r.Context(), courseID, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrCourseNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else {
			h.logger.Error("failed to publish course", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to publish course")
		}
		return
	}

	if vResp != nil && !vResp.Valid {
		h.respondJSON(w, http.StatusBadRequest, vResp)
		return
	}

	h.respondJSON(w, http.StatusOK, c)
}

func (h *Handler) ListMine(w http.ResponseWriter, r *http.Request) {
	if !auth.IsInstructorOrAdmin(r.Context()) {
		h.respondError(w, http.StatusForbidden, "Only instructors or admins can access their dashboard")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	courses, err := h.service.ListMine(r.Context(), userID)
	if err != nil {
		h.logger.Error("failed to list instructor courses", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve instructor courses")
		return
	}

	h.respondJSON(w, http.StatusOK, courses)
}

func (h *Handler) GetPreview(w http.ResponseWriter, r *http.Request) {
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

	isAdmin := auth.HasRole(r.Context(), "admin")

	preview, err := h.service.GetPreview(r.Context(), courseID, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrCourseNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else {
			h.logger.Error("failed to generate course preview", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to generate course preview")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, preview)
}

func (h *Handler) respondError(w http.ResponseWriter, status int, msg string) {
	h.respondJSON(w, status, map[string]string{"message": msg})
}

func (h *Handler) respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
