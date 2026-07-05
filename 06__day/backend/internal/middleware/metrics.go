package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/ShaharyarShakir/url-shortener/internal/metrics"
)

// Metrics is a middleware that records Prometheus metrics for each HTTP request.
func Metrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Since responseWriterWrapper is in the same package (middleware),
		// we can reuse it directly here.
		wrapper := newResponseWriterWrapper(w)

		next.ServeHTTP(wrapper, r)

		duration := time.Since(start).Seconds()

		metrics.RequestDuration.
			WithLabelValues(r.Method, r.URL.Path).
			Observe(duration)

		metrics.RequestsTotal.
			WithLabelValues(r.Method, r.URL.Path, strconv.Itoa(wrapper.statusCode)).
			Inc()
	})
}
