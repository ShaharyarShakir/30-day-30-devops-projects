package worker

import (
	"context"

	"github.com/shaharyarshakir/video-worker/internal/config"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

func InitTelemetry(cfg *config.TelemetryConfig, logger *zap.Logger) (trace.Tracer, error) {
	if !cfg.Enabled {
		logger.Info("Telemetry disabled")
		return otel.Tracer("video-worker"), nil
	}

	logger.Info("Initializing telemetry",
		zap.String("service", cfg.ServiceName),
		zap.String("jaeger_endpoint", cfg.Jaeger.Endpoint),
	)

	// Create Jaeger exporter
	exp, err := jaeger.New(jaeger.WithCollectorEndpoint(jaeger.WithEndpoint(cfg.Jaeger.Endpoint)))
	if err != nil {
		logger.Error("Failed to create Jaeger exporter", zap.Error(err))
		return nil, err
	}

	// Create resource
	res, err := resource.New(context.Background(),
		resource.WithAttributes(
			semconv.ServiceNameKey.String(cfg.ServiceName),
		),
	)
	if err != nil {
		logger.Error("Failed to create resource", zap.Error(err))
		return nil, err
	}

	// Create trace provider
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(res),
	)

	// Register as global trace provider
	otel.SetTracerProvider(tp)

	logger.Info("Telemetry initialized successfully")
	return otel.Tracer("video-worker"), nil
}
