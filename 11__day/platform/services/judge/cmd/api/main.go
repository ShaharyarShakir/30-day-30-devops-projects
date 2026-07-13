package main

import (
	"context"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/platform/services/judge/internal/consumer"
	"github.com/platform/services/judge/internal/evaluator"
	"github.com/platform/services/judge/internal/runner"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	logger.Info("Starting Judge Service")

	kafkaBroker := getenv("KAFKA_BROKER", "localhost:9092")
	requestTopic := getenv("KAFKA_REQUEST_TOPIC", "code.execution.requested")
	resultTopic := getenv("KAFKA_RESULT_TOPIC", "code.execution.completed")
	codingURL := getenv("CODING_SERVICE_URL", "http://coding:5007")

	r, err := runner.New()
	if err != nil {
		logger.Fatal("failed to create runner", zap.Error(err))
	}

	eval := evaluator.New(r)

	brokers := strings.Split(kafkaBroker, ",")
	c := consumer.New(brokers, requestTopic, resultTopic, codingURL, eval, logger)
	defer c.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sig
		logger.Info("shutting down")
		cancel()
	}()

	logger.Info("listening for submissions",
		zap.String("topic", requestTopic),
		zap.String("result_topic", resultTopic),
	)
	c.Run(ctx)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
