package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/platform/classroom/internal/repository"
)

func main() {
	godotenv.Load() //nolint

	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	dbURL := getenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/classroom_db?sslmode=disable")
	redisURL := getenv("REDIS_URL", "redis://localhost:6379")
	port := getenv("PORT", "5006")

	db, err := sqlx.Connect("postgres", dbURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer db.Close()

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to parse redis URL")
	}
	redisClient := redis.NewClient(opt)
	defer redisClient.Close()

	_ = repository.NewHandRaiseRepository(db, redisClient)
	_ = repository.NewPollRepository(db)
	_ = repository.NewQuizRepository(db)
	_ = repository.NewNotesRepository(db)
	_ = repository.NewWhiteboardRepository(db)

	r := mux.NewRouter()
	r.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`)) //nolint
	}).Methods(http.MethodGet)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		logger.Info().Str("port", port).Msg("classroom service starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx) //nolint
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
