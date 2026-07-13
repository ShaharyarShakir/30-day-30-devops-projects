package session

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/platform/services/live-session/internal/auth"
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
		h.respondError(w, http.StatusForbidden, "Only instructors or admins can create live sessions")
		return
	}

	instructorIDStr := auth.GetUserID(r.Context())
	instructorID, err := uuid.Parse(instructorIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid instructor User ID")
		return
	}

	var req CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	ls, err := h.service.CreateSession(r.Context(), req, instructorID)
	if err != nil {
		h.logger.Error("failed to create session", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to create live session")
		return
	}

	h.respondJSON(w, http.StatusCreated, ls)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	ls, err := h.service.GetSession(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else {
			h.logger.Error("failed to retrieve session", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to retrieve session info")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, ls)
}

func (h *Handler) ListByCourse(w http.ResponseWriter, r *http.Request) {
	courseIDStr := r.URL.Query().Get("course_id")
	if courseIDStr == "" {
		h.respondError(w, http.StatusBadRequest, "Missing course_id query parameter")
		return
	}

	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid course ID")
		return
	}

	sessions, err := h.service.ListSessions(r.Context(), courseID)
	if err != nil {
		h.logger.Error("failed to list sessions", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve sessions list")
		return
	}

	h.respondJSON(w, http.StatusOK, sessions)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	isAdmin := auth.HasRole(r.Context(), "admin")

	var req UpdateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	ls, err := h.service.UpdateSession(r.Context(), id, req, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else {
			h.logger.Error("failed to update session details", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to update session details")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, ls)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	isAdmin := auth.HasRole(r.Context(), "admin")

	err = h.service.DeleteSession(r.Context(), id, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else {
			h.logger.Error("failed to delete session", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to delete session")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Live session deleted successfully"})
}

func (h *Handler) Start(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	isAdmin := auth.HasRole(r.Context(), "admin")

	ls, err := h.service.StartSession(r.Context(), id, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else if errors.Is(err, ErrInvalidTransition) {
			h.respondError(w, http.StatusBadRequest, err.Error())
		} else {
			h.logger.Error("failed to start session", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to start live session")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, ls)
}

func (h *Handler) End(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	isAdmin := auth.HasRole(r.Context(), "admin")

	ls, err := h.service.EndSession(r.Context(), id, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrUnauthorized) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else if errors.Is(err, ErrInvalidTransition) {
			h.respondError(w, http.StatusBadRequest, err.Error())
		} else {
			h.logger.Error("failed to end session", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to end live session")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, ls)
}

func (h *Handler) Join(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	userRoles := auth.GetRoles(r.Context())
	userEmail := r.Header.Get("X-User-Email")

	res, err := h.service.JoinSession(r.Context(), id, userID, userRoles, userEmail)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else if errors.Is(err, ErrSessionEnded) {
			h.respondError(w, http.StatusBadRequest, err.Error())
		} else if errors.Is(err, ErrNotEnrolled) {
			h.respondError(w, http.StatusForbidden, err.Error())
		} else {
			h.logger.Error("failed to join session", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to join live session")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, res)
}

func (h *Handler) Leave(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	userIDStr := auth.GetUserID(r.Context())
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid User ID")
		return
	}

	err = h.service.LeaveSession(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, ErrParticipantNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else {
			h.logger.Error("failed to leave session", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to record leave operation")
		}
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Successfully left live session"})
}

func (h *Handler) GetPresence(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	users, err := h.service.GetOnlineUsers(r.Context(), id)
	if err != nil {
		h.logger.Error("failed to retrieve active presence", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve active users presence")
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{"presence": users})
}

func (h *Handler) respondError(w http.ResponseWriter, status int, msg string) {
	h.respondJSON(w, status, map[string]string{"message": msg})
}

func (h *Handler) respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
