package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ShaharyarShakir/url-shortener/internal/middleware"
)

func TestCORS(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	corsHandler := middleware.CORS(nextHandler)

	t.Run("Preflight Request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/shorten", nil)
		rec := httptest.NewRecorder()

		corsHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Errorf("expected status %d, got %d", http.StatusNoContent, rec.Code)
		}

		if origin := rec.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
			t.Errorf("expected Access-Control-Allow-Origin '*', got %q", origin)
		}
	})

	t.Run("Actual Request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/shorten", nil)
		rec := httptest.NewRecorder()

		corsHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
		}

		if origin := rec.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
			t.Errorf("expected Access-Control-Allow-Origin '*', got %q", origin)
		}
	})
}
