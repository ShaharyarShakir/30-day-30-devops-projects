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

func Shorten(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request ShortenRequest

	if err := json.NewDecoder(r.Body).
		Decode(&request); err != nil {

		http.Error(
			w,
			"invalid request body",
			http.StatusBadRequest,
		)

		return
	}

	shortCode, err := generateCode(6)

	if err != nil {
		http.Error(
			w,
			"internal server error",
			http.StatusInternalServerError,
		)

		return
	}

	response := ShortenResponse{
		ShortCode: shortCode,
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).
		Encode(response)
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
