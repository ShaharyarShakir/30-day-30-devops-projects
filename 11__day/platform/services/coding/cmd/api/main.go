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
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"

	"github.com/platform/services/coding/internal/auth"
	"github.com/platform/services/coding/internal/database"
	"github.com/platform/services/coding/internal/event"
	"github.com/platform/services/coding/internal/leaderboard"
	"github.com/platform/services/coding/internal/middleware"
	"github.com/platform/services/coding/internal/problem"
	"github.com/platform/services/coding/internal/result"
	"github.com/platform/services/coding/internal/submission"
	"strings"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	logger.Info("Starting Coding Service...")

	// Load configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("CODING_SERVICE_PORT")
		if port == "" {
			port = "5007"
		}
	}

	dbHost := os.Getenv("POSTGRES_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbPort := os.Getenv("POSTGRES_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	dbUser := os.Getenv("POSTGRES_USER")
	if dbUser == "" {
		dbUser = "postgres"
	}
	dbPass := os.Getenv("POSTGRES_PASSWORD")
	if dbPass == "" {
		dbPass = "postgres"
	}
	dbName := os.Getenv("POSTGRES_DB")
	if dbName == "" {
		dbName = "coding_db"
	}

	kafkaBroker := os.Getenv("KAFKA_BROKER")
	if kafkaBroker == "" {
		kafkaBroker = "localhost:9092"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super_secret_platform_dev_jwt_key_that_is_at_least_256_bits_long_for_security_standards"
	}

	// Aligned centralized Kafka topic
	kafkaTopic := "code.execution.requested"

	// Create Postgres DSN
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", dbUser, dbPass, dbHost, dbPort, dbName)

	logger.Info("Database connection string constructed", zap.String("host", dbHost), zap.String("port", dbPort), zap.String("db", dbName))

	// Run migrations
	logger.Info("Running database migrations...")
	if err := database.RunMigrations(dsn); err != nil {
		logger.Fatal("Database migrations failed", zap.Error(err))
	}
	logger.Info("Database migrations completed successfully.")

	// Connect to database pool
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	pool, err := database.Connect(ctx, dsn)
	if err != nil {
		logger.Fatal("Database connection pool failed", zap.Error(err))
	}
	defer pool.Close()
	logger.Info("Database connection pool established.")

	// Init sqlc Queries
	queries := database.New(pool)

	// Init Kafka writer
	kafkaWriter := &kafka.Writer{
		Addr:     kafka.TCP(kafkaBroker),
		Topic:    kafkaTopic,
		Balancer: &kafka.LeastBytes{},
	}
	defer kafkaWriter.Close()

	// Init Event Publisher
	var eventPub event.Publisher
	if kafkaBroker != "" {
		logger.Info("Initializing Kafka Event Publisher...", zap.String("broker", kafkaBroker), zap.String("topic", kafkaTopic))
		eventPub = event.NewKafkaPublisher(kafkaBroker, kafkaTopic, logger)
	} else {
		logger.Warn("KAFKA_BROKER environment variable not set, using NOOP Event Publisher")
		eventPub = event.NewNoopPublisher(logger)
	}
	defer eventPub.Close()

	// Initialize Repositories
	problemRepo := problem.NewPostgresRepository(pool, queries)
	submissionRepo := submission.NewPostgresRepository(pool, queries)
	leaderboardRepo := leaderboard.NewPostgresRepository(pool)

	// Initialize Services
	problemService := problem.NewService(problemRepo)
	submissionService := submission.NewService(submissionRepo, eventPub, kafkaWriter)
	leaderboardService := leaderboard.NewService(leaderboardRepo)

	// Initialize Outbox Publisher Background Worker
	outboxPub := event.NewOutboxPublisher(pool, queries, eventPub, logger)
	outboxCtx, cancelOutbox := context.WithCancel(context.Background())
	defer cancelOutbox()
	go outboxPub.Start(outboxCtx)

	// Start result consumer (listens on code.execution.completed)
	resultConsumer := result.NewConsumer(
		strings.Split(kafkaBroker, ","),
		"code.execution.completed",
		pool,
		queries,
		logger,
	)
	defer resultConsumer.Close()
	resultCtx, cancelResult := context.WithCancel(context.Background())
	defer cancelResult()
	go resultConsumer.Run(resultCtx)

	// Initialize Handlers
	problemHandler := problem.NewHandler(problemService, logger)
	submissionHandler := submission.NewHandler(submissionService, logger)
	leaderboardHandler := leaderboard.NewHandler(leaderboardService, logger)

	// Setup Gorilla Router
	r := mux.NewRouter()

	// Global Middlewares
	r.Use(middleware.LoggerMiddleware(logger))

	// Health Endpoints
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	}).Methods(http.MethodGet)

	// Protected routes under prefix /coding
	api := r.PathPrefix("/coding").Subrouter()
	api.Use(auth.AuthMiddleware)

	// Problem routes
	api.HandleFunc("/problems", problemHandler.List).Methods(http.MethodGet)
	api.HandleFunc("/problems", problemHandler.Create).Methods(http.MethodPost)
	api.HandleFunc("/problems/{id}", problemHandler.GetByID).Methods(http.MethodGet)
	api.HandleFunc("/problems/{id}", problemHandler.Update).Methods(http.MethodPatch)
	api.HandleFunc("/problems/{id}", problemHandler.Delete).Methods(http.MethodDelete)
	api.HandleFunc("/problems/slug/{slug}", problemHandler.GetBySlug).Methods(http.MethodGet)
	api.HandleFunc("/problems/{id}/test-cases", problemHandler.GetTestCases).Methods(http.MethodGet)

	// Submission routes
	api.HandleFunc("/submissions", submissionHandler.ListByUser).Methods(http.MethodGet)
	api.HandleFunc("/submissions", submissionHandler.Create).Methods(http.MethodPost)
	api.HandleFunc("/submissions/{id}", submissionHandler.GetByID).Methods(http.MethodGet)
	api.HandleFunc("/submissions/{id}/results", submissionHandler.GetResults).Methods(http.MethodGet)
	api.HandleFunc("/problems/{problem_id}/submissions", submissionHandler.ListByProblem).Methods(http.MethodGet)

	// Leaderboard routes
	api.HandleFunc("/leaderboards/problems/{problem_id}", leaderboardHandler.GetLeaderboard).Methods(http.MethodGet)
	api.HandleFunc("/leaderboards/user", leaderboardHandler.GetUserRankings).Methods(http.MethodGet)
	api.HandleFunc("/leaderboards/problems/{problem_id}/user", leaderboardHandler.GetUserProblemRanking).Methods(http.MethodGet)

	// Internal routes (no auth — only reachable within the cluster)
	internal := r.PathPrefix("/internal").Subrouter()
	internal.HandleFunc("/problems/{id}", problemHandler.GetByID).Methods(http.MethodGet)
	internal.HandleFunc("/problems/{id}/test-cases", problemHandler.GetTestCasesInternal).Methods(http.MethodGet)

	// Start server
	serverAddr := ":" + port
	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      r,
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("Starting HTTP server", zap.String("addr", serverAddr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("HTTP server failed to start", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down HTTP server gracefully...")

	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := srv.Shutdown(ctxShutdown); err != nil {
		logger.Fatal("HTTP server forced to shutdown", zap.Error(err))
	}

	logger.Info("HTTP server stopped successfully.")
}
