package problem

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"
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
	problem, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrProblemNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else {
			h.logger.Error("failed to get problem", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to get problem")
		}
		return
	}
	h.respondJSON(w, http.StatusOK, problem)
}

func (h *Handler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["slug"]
	problem, err := h.service.GetBySlug(r.Context(), slug)
	if err != nil {
		if errors.Is(err, ErrProblemNotFound) {
			h.respondError(w, http.StatusNotFound, err.Error())
		} else {
			h.logger.Error("failed to get problem", zap.Error(err))
			h.respondError(w, http.StatusInternalServerError, "Failed to get problem")
		}
		return
	}
	h.respondJSON(w, http.StatusOK, problem)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	problems, err := h.service.List(r.Context())
	if err != nil {
		h.logger.Error("failed to list problems", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to list problems")
		return
	}
	h.respondJSON(w, http.StatusOK, problems)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateProblemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	problem, err := h.service.Create(r.Context(), req)
	if err != nil {
		h.logger.Error("failed to create problem", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to create problem")
		return
	}
	h.respondJSON(w, http.StatusCreated, problem)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	var req UpdateProblemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	problem, err := h.service.Update(r.Context(), id, req)
	if err != nil {
		h.logger.Error("failed to update problem", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to update problem")
		return
	}
	h.respondJSON(w, http.StatusOK, problem)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if err := h.service.Delete(r.Context(), id); err != nil {
		h.logger.Error("failed to delete problem", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to delete problem")
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Problem deleted successfully"})
}

func (h *Handler) GetLanguages(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	languages, err := h.service.GetLanguages(r.Context(), id)
	if err != nil {
		h.logger.Error("failed to get problem languages", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to get problem languages")
		return
	}
	h.respondJSON(w, http.StatusOK, languages)
}

func (h *Handler) GetTestCases(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	testCases, err := h.service.GetTestCases(r.Context(), id)
	if err != nil {
		h.logger.Error("failed to get test cases", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to get test cases")
		return
	}
	// Never expose hidden test case inputs/outputs to the frontend
	filteredTestCases := make([]TestCase, len(testCases))
	for i, tc := range testCases {
		filteredTestCases[i] = *tc
		if filteredTestCases[i].Hidden {
			filteredTestCases[i].Input = nil
			filteredTestCases[i].ExpectedOutput = nil
		}
	}
	h.respondJSON(w, http.StatusOK, filteredTestCases)
}

// GetTestCasesInternal returns all test cases including hidden ones.
// Only accessible from internal services (judge), not exposed via gateway.
func (h *Handler) GetTestCasesInternal(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	testCases, err := h.service.GetTestCases(r.Context(), id)
	if err != nil {
		h.logger.Error("failed to get test cases (internal)", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Failed to get test cases")
		return
	}
	h.respondJSON(w, http.StatusOK, testCases)
}

func (h *Handler) respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func (h *Handler) respondError(w http.ResponseWriter, status int, msg string) {
	h.respondJSON(w, status, map[string]string{"message": msg})
}
