package submission

import (
	"encoding/json"
	"errors"
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

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	sub, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrSubmissionNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else {
			h.logger.Error("failed to get submission", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to get submission")
		}
		return
	}
	h.respondJSON(w, http.StatusOK, sub)
}

func (h *Handler) ListByUser(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	
	// Parse query parameters for filtering
	query := r.URL.Query()
	problemID := query.Get("problem_id")
	language := query.Get("language")
	status := query.Get("status")
	limit := query.Get("limit")
	offset := query.Get("offset")
	
	subs, err := h.service.ListByUserWithFilters(r.Context(), userID, problemID, language, status, limit, offset)
	if err != nil {
		h.logger.Error("failed to list submissions", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to list submissions")
		return
	}
	h.respondJSON(w, http.StatusOK, subs)
}

func (h *Handler) ListByProblem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	problemID := vars["problem_id"]
	subs, err := h.service.ListByProblem(r.Context(), problemID)
	if err != nil {
		h.logger.Error("failed to list submissions", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to list submissions")
		return
	}
	h.respondJSON(w, http.StatusOK, subs)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	var req CreateSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	sub, err := h.service.Create(r.Context(), userID, req)
	if err != nil {
		h.logger.Error("failed to create submission", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to create submission")
		return
	}
	h.respondJSON(w, http.StatusCreated, sub)
}

func (h *Handler) GetResults(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	results, err := h.service.GetResults(r.Context(), id)
	if err != nil {
		h.logger.Error("failed to get submission results", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to get submission results")
		return
	}
	h.respondJSON(w, http.StatusOK, results)
}

func (h *Handler) respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func (h *Handler) respondError(w http.ResponseWriter, status int, msg string) {
	h.respondJSON(w, status, map[string]string{"message": msg})
}
