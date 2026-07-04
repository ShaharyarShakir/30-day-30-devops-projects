package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ShaharyarShakir/url-shortener/internal/handlers"
	"github.com/ShaharyarShakir/url-shortener/internal/middleware"
)

func main() {
	mux := http.NewServeMux()
	handler := middleware.CORS(middleware.Logging(mux))
	mux.HandleFunc("GET /health", handlers.Health)
	mux.HandleFunc("POST /api/v1/shorten", handlers.Shorten)
	mux.HandleFunc(
		"GET /livez",
		handlers.Health,
	)

	mux.HandleFunc(
		"GET /readyz",
		handlers.Health,
	)
	server := &http.Server{
		Addr:         ":8080",
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Println("server listening on :8080")

		if err := server.ListenAndServe(); err != nil &&
			err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)

	signal.Notify(
		stop,
		os.Interrupt,
		syscall.SIGTERM,
	)

	<-stop

	log.Println("shutting down server")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		30*time.Second,
	)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}

	log.Println("server stopped")
}
