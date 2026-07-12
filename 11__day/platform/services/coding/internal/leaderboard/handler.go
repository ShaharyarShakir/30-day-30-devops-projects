package leaderboard

import (
	"encoding/json"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"
	"github.com/platform/services/coding/internal/auth"
	"go.uber.org/zap"
)

type Handler struct {
	service  *Service
	validate *validator.Validate
	logger   *zap.Logger
}

func NewHandler(service *Service, logger *zap.Logger) *Handler {
	return &Handler{
		service:  service,
		validate: validator.New(),
		logger:   logger,
	}
}

func (h *Handler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	problemID := vars["problem_id"]
	
	query := r.URL.Query()
	limit := query.Get("limit")
	offset := query.Get("offset")
	orderBy := query.Get("order_by")
	
	entries, err := h.service.GetLeaderboard(r.Context(), problemID, limit, offset, orderBy)
	if err != nil {
		h.logger.Error("failed to get leaderboard", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to get leaderboard")
		return
	}
	h.respondJSON(w, http.StatusOK, entries)
}

func (h *Handler) GetUserRankings(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	
	entries, err := h.service.GetUserRankings(r.Context(), userID)
	if err != nil {
		h.logger.Error("failed to get user rankings", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to get user rankings")
		return
	}
	h.respondJSON(w, http.StatusOK, entries)
}

func (h *Handler) GetUserProblemRanking(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	problemID := vars["problem_id"]
	userID := auth.GetUserID(r.Context())
	
	entry, err := h.service.GetUserProblemRanking(r.Context(), problemID, userID)
	if err != nil {
		if err == ErrLeaderboardEntryNotFound {
			h.respondError(w, http.StatusNotFound, "Leaderboard entry not found")
		} else {
			h.logger.Error("failed to get user problem ranking", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to get user problem ranking")
		}
		return
	}
	h.respondJSON(w, http.StatusOK, entry)
}

func (h *Handler) respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func (h *Handler) respondError(w http.ResponseWriter, status int, msg string) {
	h.respondJSON(w, status, map[string]string{"message": msg})
}
