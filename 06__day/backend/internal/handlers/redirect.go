package handlers

import (
	"net/http"
)

// Redirect redirects the short code to its original URL.
func (h *Handler) Redirect(
	w http.ResponseWriter,
	r *http.Request,
) {
	code := r.PathValue("code")

	url, err := h.DB.GetURL(
		r.Context(),
		code,
	)

	if err != nil {
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
