package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.opentelemetry.io/otel/trace"
)

// LogEntry represents the structured fields printed for every HTTP request.
type LogEntry struct {
	Timestamp  string `json:"timestamp"`
	Level      string `json:"level"`
	Method     string `json:"method"`
	Path       string `json:"path"`
	Status     int    `json:"status"`
	DurationMs int64  `json:"duration_ms"`
	TraceID    string `json:"trace_id,omitempty"`
	SpanID     string `json:"span_id,omitempty"`
}

// responseWriterWrapper wraps standard http.ResponseWriter to capture status code.
type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriterWrapper(w http.ResponseWriter) *responseWriterWrapper {
	return &responseWriterWrapper{ResponseWriter: w, statusCode: http.StatusOK}
}

func (w *responseWriterWrapper) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

// Logging is a middleware that writes structured JSON access logs to stdout.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapper := newResponseWriterWrapper(w)

		next.ServeHTTP(wrapper, r)

		spanContext := trace.SpanContextFromContext(r.Context())
		var traceID, spanID string
		if spanContext.IsValid() {
			traceID = spanContext.TraceID().String()
			spanID = spanContext.SpanID().String()
		}

		entry := LogEntry{
			Timestamp:  time.Now().UTC().Format(time.RFC3339),
			Level:      "info",
			Method:     r.Method,
			Path:       r.URL.Path,
			Status:     wrapper.statusCode,
			DurationMs: time.Since(start).Milliseconds(),
			TraceID:    traceID,
			SpanID:     spanID,
		}

		b, _ := json.Marshal(entry)
		fmt.Println(string(b))
	})
}

// Recovery is a middleware that recovers from panics and returns an Internal Server Error.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				http.Error(
					w,
					"internal server error",
					http.StatusInternalServerError,
				)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

