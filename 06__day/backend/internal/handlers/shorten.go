package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"

	"go.opentelemetry.io/otel"
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
	tracer := otel.Tracer("url-shortener")
	ctx, span := tracer.Start(r.Context(), "create-short-url")
	defer span.End()

	var req ShortenRequest

	if err := json.NewDecoder(r.Body).
		Decode(&req); err != nil {

		span.RecordError(err)
		http.Error(
			w,
			"invalid request",
			http.StatusBadRequest,
		)

		return
	}

	code, err := generateCode(6)
	if err != nil {
		span.RecordError(err)
		http.Error(
			w,
			"failed to generate code",
			http.StatusInternalServerError,
		)

		return
	}

	err = h.DB.CreateURL(
		ctx,
		req.URL,
		code,
	)

	if err != nil {
		span.RecordError(err)
		http.Error(
			w,
			"database error",
			http.StatusInternalServerError,
		)

		return
	}

	_ = json.NewEncoder(w).Encode(
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
