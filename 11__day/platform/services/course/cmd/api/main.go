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
	"go.uber.org/zap"

	"github.com/platform/services/course/internal/auth"
	"github.com/platform/services/course/internal/category"
	"github.com/platform/services/course/internal/course"
	"github.com/platform/services/course/internal/database"
	"github.com/platform/services/course/internal/enrollment"
	"github.com/platform/services/course/internal/event"
	"github.com/platform/services/course/internal/lesson"
	"github.com/platform/services/course/internal/middleware"
	"github.com/platform/services/course/internal/section"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	logger.Info("Starting Course Service...")

	// Load configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("COURSE_SERVICE_PORT")
		if port == "" {
			port = "5002"
		}
	}

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = os.Getenv("POSTGRES_HOST")
		if dbHost == "" {
			dbHost = "localhost"
		}
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = os.Getenv("POSTGRES_PORT")
		if dbPort == "" {
			dbPort = "5432"
		}
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = os.Getenv("POSTGRES_USER")
		if dbUser == "" {
			dbUser = "postgres"
		}
	}

	dbPass := os.Getenv("DB_PASSWORD")
	if dbPass == "" {
		dbPass = os.Getenv("POSTGRES_PASSWORD")
		if dbPass == "" {
			dbPass = "postgres"
		}
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "courses_db"
	}

	kafkaBroker := os.Getenv("KAFKA_BROKER")
	if kafkaBroker == "" {
		kafkaBroker = "localhost:9092"
	}

	// Aligned centralized Kafka topic
	kafkaTopic := "platform.course-events"

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

	// Init Event Publisher
	var publisher event.Publisher
	if kafkaBroker != "" {
		logger.Info("Initializing Kafka Event Publisher...", zap.String("broker", kafkaBroker), zap.String("topic", kafkaTopic))
		publisher = event.NewKafkaPublisher(kafkaBroker, kafkaTopic, logger)
	} else {
		logger.Warn("KAFKA_BROKER environment variable not set, using NOOP Event Publisher")
		publisher = event.NewNoopPublisher(logger)
	}
	defer publisher.Close()

	// Initialize Repositories
	catRepo := category.NewPostgresRepository(queries)
	courseRepo := course.NewPostgresRepository(pool, queries)
	secRepo := section.NewPostgresRepository(pool, queries)
	lesRepo := lesson.NewPostgresRepository(pool, queries)
	enrRepo := enrollment.NewPostgresRepository(pool, queries)

	// Initialize Services
	catService := category.NewService(catRepo)
	courseService := course.NewService(courseRepo, queries, publisher)
	secService := section.NewService(secRepo, queries)
	lesService := lesson.NewService(lesRepo, queries)
	enrService := enrollment.NewService(enrRepo, queries, publisher)

	// Initialize Outbox Publisher Background Worker
	outboxPub := event.NewOutboxPublisher(pool, queries, publisher, logger)
	outboxCtx, cancelOutbox := context.WithCancel(context.Background())
	defer cancelOutbox()
	go outboxPub.Start(outboxCtx)

	// Initialize Handlers
	catHandler := category.NewHandler(catService, logger)
	courseHandler := course.NewHandler(courseService, logger)
	secHandler := section.NewHandler(secService, logger)
	lesHandler := lesson.NewHandler(lesService, logger)
	enrHandler := enrollment.NewHandler(enrService, logger)

	// Setup Gorilla Router
	r := mux.NewRouter()

	// Global Middlewares
	r.Use(middleware.RecoveryMiddleware(logger))
	r.Use(middleware.LoggerMiddleware(logger))

	// Health Endpoints
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	}).Methods(http.MethodGet)

	// Category Endpoints
	r.HandleFunc("/categories", catHandler.List).Methods(http.MethodGet)

	// Protected downstream course routes
	api := r.PathPrefix("/courses").Subrouter()
	api.Use(auth.AuthMiddleware)

	api.HandleFunc("/mine", courseHandler.ListMine).Methods(http.MethodGet)
	api.HandleFunc("", courseHandler.List).Methods(http.MethodGet)
	api.HandleFunc("", courseHandler.Create).Methods(http.MethodPost)
	api.HandleFunc("/{id}/preview", courseHandler.GetPreview).Methods(http.MethodGet)
	api.HandleFunc("/{id}", courseHandler.Get).Methods(http.MethodGet)
	api.HandleFunc("/{id}", courseHandler.Update).Methods(http.MethodPatch)
	api.HandleFunc("/{id}", courseHandler.Delete).Methods(http.MethodDelete)
	api.HandleFunc("/{id}/publish", courseHandler.Publish).Methods(http.MethodPost)
	api.HandleFunc("/{id}/sections", secHandler.Create).Methods(http.MethodPost)
	api.HandleFunc("/{id}/enroll", enrHandler.Enroll).Methods(http.MethodPost)
	api.HandleFunc("/{id}/enrollments/{userId}", enrHandler.CheckEnrollment).Methods(http.MethodGet)

	// Protected downstream sections routes
	secApi := r.PathPrefix("/sections").Subrouter()
	secApi.Use(auth.AuthMiddleware)
	secApi.HandleFunc("/{id}/lessons", lesHandler.Create).Methods(http.MethodPost)

	// Protected me routes
	meApi := r.PathPrefix("/me").Subrouter()
	meApi.Use(auth.AuthMiddleware)
	meApi.HandleFunc("/enrollments", enrHandler.ListMe).Methods(http.MethodGet)

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
		logger.Info("Course Service HTTP server listening", zap.String("addr", serverAddr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("HTTP server failed to listen", zap.Error(err))
		}
	}()

	// Wait for termination signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Stopping outbox background worker...")
	cancelOutbox()

	logger.Info("Shutting down HTTP server gracefully...")
	ctxShut, cancelShut := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShut()

	if err := srv.Shutdown(ctxShut); err != nil {
		logger.Error("HTTP server shutdown forced", zap.Error(err))
	}

	logger.Info("Course Service stopped.")
}
