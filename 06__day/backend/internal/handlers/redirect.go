package handlers

import (
	"net/http"

	"go.opentelemetry.io/otel"
)

// Redirect redirects the short code to its original URL.
func (h *Handler) Redirect(
	w http.ResponseWriter,
	r *http.Request,
) {
	tracer := otel.Tracer("url-shortener")
	ctx, span := tracer.Start(r.Context(), "redirect-short-url")
	defer span.End()

	code := r.PathValue("code")

	url, err := h.DB.GetURL(
		ctx,
		code,
	)

	if err != nil {
		span.RecordError(err)
		http.NotFound(w, r)
		return
	}

	http.Redirect(
		w,
		r,
		url,
		http.StatusTemporaryRedirect,
	)
}
