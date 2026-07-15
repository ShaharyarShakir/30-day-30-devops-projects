package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/shaharyarshakir/video-worker/internal/config"
	"github.com/shaharyarshakir/video-worker/internal/ffmpeg"
	"github.com/shaharyarshakir/video-worker/internal/hls"
	"github.com/shaharyarshakir/video-worker/internal/kafka"
	"github.com/shaharyarshakir/video-worker/internal/metadata"
	"github.com/shaharyarshakir/video-worker/internal/pipeline"
	"github.com/shaharyarshakir/video-worker/internal/storage"
	"github.com/shaharyarshakir/video-worker/internal/temp"
	"github.com/shaharyarshakir/video-worker/internal/thumbnail"
	"github.com/shaharyarshakir/video-worker/internal/worker"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfgPath := os.Getenv("CONFIG_PATH")
	if cfgPath == "" {
		cfgPath = "internal/config/config.yaml"
	}

	cfg, err := config.Load(cfgPath)
	if err != nil {
		panic(fmt.Sprintf("Failed to load config: %v", err))
	}

	if err := cfg.Validate(); err != nil {
		panic(fmt.Sprintf("Invalid config: %v", err))
	}

	// Initialize logger
	var logger *zap.Logger

	switch cfg.Server.LogLevel {
	case "debug":
		logger, err = zap.NewDevelopment()
	case "info":
		logger, err = zap.NewProduction()
	default:
		logger, err = zap.NewProduction()
	}

	if err != nil {
		panic(fmt.Sprintf("Failed to create logger: %v", err))
	}
	defer logger.Sync()

	zap.ReplaceGlobals(logger)
	logger.Info("Starting video worker",
		zap.String("environment", cfg.Server.Environment),
	)

	// Initialize telemetry
	tracer, err := worker.InitTelemetry(&cfg.Telemetry, logger)
	if err != nil {
		logger.Warn("Failed to initialize telemetry", zap.Error(err))
	}
	_ = tracer

	// Initialize storage client
	storageClient, err := storage.NewClient(&storage.Config{
		Endpoint:       cfg.Storage.Endpoint,
		AccessKey:      cfg.Storage.AccessKey,
		SecretKey:      cfg.Storage.SecretKey,
		Bucket:         cfg.Storage.Bucket,
		Region:         cfg.Storage.Region,
		UseSSL:         cfg.Storage.UseSSL,
		ForcePathStyle: cfg.Storage.ForcePathStyle,
	}, logger)
	if err != nil {
		panic(fmt.Sprintf("Failed to create storage client: %v", err))
	}

	// Initialize temp manager
	tempMgr, err := temp.NewManager(cfg.Worker.TempDir, logger)
	if err != nil {
		panic(fmt.Sprintf("Failed to create temp manager: %v", err))
	}

	// Cleanup on startup if configured
	if cfg.Worker.CleanupOnExit {
		if err := tempMgr.CleanupAll(); err != nil {
			logger.Warn("Failed to cleanup temp files on startup", zap.Error(err))
		}
	}

	// Initialize prober
	prober := metadata.NewProber(cfg.FFmpeg.FfprobePath, logger)

	// Initialize transcoder
	transcoder := ffmpeg.NewTranscoder(&cfg.FFmpeg, logger)

	// Initialize HLS generator
	hlsGenerator := hls.NewGenerator(transcoder, &cfg.FFmpeg, logger)

	// Initialize thumbnail generator
	thumbGenerator := thumbnail.NewGenerator(transcoder, logger)

	// Initialize Kafka producer
	kafkaProducer, err := kafka.NewProducer(cfg.Kafka.Brokers, map[string]string{
		"processing_progress": cfg.Kafka.Topics.ProcessingProgress,
		"processing_finished": cfg.Kafka.Topics.ProcessingFinished,
		"processing_failed":   cfg.Kafka.Topics.ProcessingFailed,
	}, logger)
	if err != nil {
		panic(fmt.Sprintf("Failed to create Kafka producer: %v", err))
	}
	defer kafkaProducer.Close()

	// Initialize pipeline
	procPipeline := pipeline.NewPipeline(
		cfg,
		storageClient,
		tempMgr,
		prober,
		transcoder,
		hlsGenerator,
		thumbGenerator,
		kafkaProducer,
		logger,
	)

	// Initialize Kafka consumer
	kafkaConsumer, err := kafka.NewConsumer(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, map[string]string{
		"upload_completed": cfg.Kafka.Topics.UploadCompleted,
	}, logger)
	if err != nil {
		panic(fmt.Sprintf("Failed to create Kafka consumer: %v", err))
	}

	// Set handler
	kafkaConsumer.SetHandler(func(ctx context.Context, event *kafka.UploadCompletedEvent) error {
		return procPipeline.Process(ctx, event)
	})

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start consumer in goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := kafkaConsumer.Start(ctx); err != nil {
			errChan <- err
		}
	}()

	logger.Info("Video worker started successfully")

	// Wait for shutdown signal or error
	select {
	case <-sigChan:
		logger.Info("Received shutdown signal")
		cancel()
	case err := <-errChan:
		logger.Error("Consumer error", zap.Error(err))
		cancel()
	}

	logger.Info("Shutting down video worker")

	// Final cleanup
	if cfg.Worker.CleanupOnExit {
		if err := tempMgr.CleanupAll(); err != nil {
			logger.Error("Failed to cleanup temp files on shutdown", zap.Error(err))
		}
	}

	logger.Info("Video worker stopped")
}
