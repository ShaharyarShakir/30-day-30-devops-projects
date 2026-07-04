package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
)

type ShortenRequest struct {
	URL string `json:"url"`
}

type ShortenResponse struct {
	ShortCode string `json:"short_code"`
}

func (h *Handler) Shorten(
	w http.ResponseWriter,
	r *http.Request,
) {
	var req ShortenRequest

	if err := json.NewDecoder(r.Body).
		Decode(&req); err != nil {

		http.Error(
			w,
			"invalid request",
			http.StatusBadRequest,
		)

		return
	}

	code, err := generateCode(6)
	if err != nil {
		http.Error(
			w,
			"failed to generate code",
			http.StatusInternalServerError,
		)

		return
	}

	err = h.DB.CreateURL(
		r.Context(),
		req.URL,
		code,
	)

	if err != nil {
		http.Error(
			w,
			"database error",
			http.StatusInternalServerError,
		)

		return
	}

	json.NewEncoder(w).Encode(
		map[string]string{
			"short_code": code,
		},
	)
}

func generateCode(
	length int,
) (string, error) {

	bytes := make([]byte, length)

	_, err := rand.Read(bytes)

	if err != nil {
		return "", err
	}

	return base64.RawURLEncoding.
		EncodeToString(bytes)[:length], nil
}
