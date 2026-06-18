package rag

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	Service Service
}

func NewHandler(s Service) Handler {
	return Handler{Service: s}
}

func (h Handler) Ask(w http.ResponseWriter, r *http.Request) {

	var body struct {
		Query string `json:"query"`
	}

	json.NewDecoder(r.Body).Decode(&body)

	resp, err := h.Service.Ask(r.Context(), body.Query)

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"answer": resp,
	})
}

func Routes(h Handler) chi.Router {
	r := chi.NewRouter()

	r.Post("/", h.Ask)

	return r
}
