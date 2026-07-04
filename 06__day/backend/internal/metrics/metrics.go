package metrics

import "github.com/prometheus/client_golang/prometheus"

// RequestsTotal tracks the total number of HTTP requests processed.
var RequestsTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total HTTP requests processed by method, path, and response status code.",
	},
	[]string{
		"method",
		"path",
		"status",
	},
)

// RequestDuration tracks the duration of HTTP requests in seconds.
var RequestDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "http_request_duration_seconds",
		Help:    "Request duration in seconds histogram by method and path.",
		Buckets: prometheus.DefBuckets,
	},
	[]string{
		"method",
		"path",
	},
)

// Init registers all custom metrics with Prometheus.
func Init() {
	prometheus.MustRegister(
		RequestsTotal,
		RequestDuration,
	)
}
