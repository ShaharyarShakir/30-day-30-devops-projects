package search

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

func (h Handler) Search(w http.ResponseWriter, r *http.Request) {

	var body struct {
		Query string `json:"query"`
	}

	json.NewDecoder(r.Body).Decode(&body)

	results, err := h.Service.Search(r.Context(), body.Query)

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	json.NewEncoder(w).Encode(results)
}

func Routes(h Handler) chi.Router {
	r := chi.NewRouter()

	r.Post("/", h.Search)

	return r
}
