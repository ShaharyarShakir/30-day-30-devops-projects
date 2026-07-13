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
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/platform/services/live-session/internal/auth"
	"github.com/platform/services/live-session/internal/database"
	"github.com/platform/services/live-session/internal/event"
	"github.com/platform/services/live-session/internal/middleware"
	"github.com/platform/services/live-session/internal/presence"
	"github.com/platform/services/live-session/internal/session"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	logger.Info("Starting Live Session Service...")

	// Load configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("LIVE_SESSION_SERVICE_PORT")
		if port == "" {
			port = "5005"
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
		dbName = "live_sessions_db"
	}

	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}
	redisPass := os.Getenv("REDIS_PASSWORD")

	kafkaBroker := os.Getenv("KAFKA_BROKER")
	if kafkaBroker == "" {
		kafkaBroker = "localhost:9092"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super_secret_platform_dev_jwt_key_that_is_at_least_256_bits_long_for_security_standards"
	}

	courseServiceURL := os.Getenv("COURSE_SERVICE_URL")
	if courseServiceURL == "" {
		courseServiceURL = "http://localhost:5002"
	}

	// Aligned centralized Kafka topic
	kafkaTopic := "platform.live-session-events"

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

	// Connect to Redis
	rdbAddr := fmt.Sprintf("%s:%s", redisHost, redisPort)
	logger.Info("Connecting to Redis...", zap.String("addr", rdbAddr))
	rdbClient := redis.NewClient(&redis.Options{
		Addr:     rdbAddr,
		Password: redisPass,
		DB:       0,
	})
	defer rdbClient.Close()

	redisCtx, redisCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer redisCancel()
	if err := rdbClient.Ping(redisCtx).Err(); err != nil {
		logger.Fatal("Redis ping failed", zap.Error(err))
	}
	logger.Info("Redis connection established.")

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

	// Initialize Presence Manager
	presenceMgr := presence.NewManager(rdbClient)

	// Initialize Repositories
	sessionRepo := session.NewPostgresRepository(pool, queries)

	// Initialize LiveKit client
	livekitClient := livekit.NewRoomServiceClient(livekitURL, livekitAPIKey, livekitAPISecret)

	// Initialize Services
	sessionService := session.NewService(sessionRepo, presenceManager, jwtSecret, courseServiceURL, livekitURL, livekitAPIKey, livekitAPISecret, livekitClient)

	// Initialize Outbox Publisher Background Worker
	outboxPub := event.NewOutboxPublisher(pool, queries, publisher, logger)
	outboxCtx, cancelOutbox := context.WithCancel(context.Background())
	defer cancelOutbox()
	go outboxPub.Start(outboxCtx)

	// Initialize Handlers
	sessionHandler := session.NewHandler(sessionService, logger)

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

	// Protected routes under prefix /sessions
	api := r.PathPrefix("/sessions").Subrouter()
	api.Use(auth.AuthMiddleware)

	api.HandleFunc("", sessionHandler.Create).Methods(http.MethodPost)
	api.HandleFunc("", sessionHandler.ListByCourse).Methods(http.MethodGet)
	api.HandleFunc("/{id}", sessionHandler.Get).Methods(http.MethodGet)
	api.HandleFunc("/{id}", sessionHandler.Update).Methods(http.MethodPatch)
	api.HandleFunc("/{id}", sessionHandler.Delete).Methods(http.MethodDelete)
	api.HandleFunc("/{id}/start", sessionHandler.Start).Methods(http.MethodPost)
	api.HandleFunc("/{id}/end", sessionHandler.End).Methods(http.MethodPost)
	api.HandleFunc("/{id}/join", sessionHandler.Join).Methods(http.MethodPost)
	api.HandleFunc("/{id}/leave", sessionHandler.Leave).Methods(http.MethodPost)
	api.HandleFunc("/{id}/presence", sessionHandler.GetPresence).Methods(http.MethodGet)

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
