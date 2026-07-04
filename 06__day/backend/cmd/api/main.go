package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ShaharyarShakir/url-shortener/internal/config"
	"github.com/ShaharyarShakir/url-shortener/internal/handlers"
	"github.com/ShaharyarShakir/url-shortener/internal/metrics"
	"github.com/ShaharyarShakir/url-shortener/internal/middleware"
	"github.com/ShaharyarShakir/url-shortener/internal/storage"
	"github.com/ShaharyarShakir/url-shortener/internal/telemetry"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
	if err := config.LoadVaultSecrets(); err != nil {
		log.Fatalf("failed to load Vault secrets: %v", err)
	}

	// Initialize metrics
	metrics.Init()

	// Initialize tracing
	shutdownTracer := telemetry.InitTracer()
	defer func() {
		_ = shutdownTracer(context.Background())
	}()

	mux := http.NewServeMux()

	db, err := storage.NewPostgres()
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.DB.Close()

	h := handlers.NewHandler(db)

	// Register routes
	mux.HandleFunc("GET /health", handlers.Health)
	mux.HandleFunc("POST /api/v1/shorten", h.Shorten)
	mux.HandleFunc("GET /{code}", h.Redirect)
	mux.HandleFunc("GET /livez", handlers.Health)
	mux.HandleFunc("GET /readyz", handlers.Health)

	// Expose Prometheus metrics route
	mux.Handle("GET /metrics", promhttp.Handler())

	// Build middleware chain
	// CORS -> Metrics -> Tracing (otelhttp) -> Logging -> mux
	loggingHandler := middleware.Logging(mux)
	otelHandler := otelhttp.NewHandler(loggingHandler, "http-server")
	metricsHandler := middleware.Metrics(otelHandler)
	handler := middleware.CORS(metricsHandler)

	server := &http.Server{
		Addr:         ":8080",
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Println("server listening on :8080")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("shutting down server")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}

	log.Println("server stopped")
}
