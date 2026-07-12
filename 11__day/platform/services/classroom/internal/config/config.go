package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          int
	DatabaseURL   string
	RedisURL      string
	KafkaBroker   string
	JWTSecret     string
	AWSRegion     string
	AWSAccessKey  string
	AWSSecretKey  string
	S3Bucket      string
	Environment   string
}

func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		// .env file is optional in production
	}

	cfg := &Config{
		Port:          getEnvAsInt("PORT", 5006),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://localhost:5432/classroom?sslmode=disable"),
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
		KafkaBroker:   getEnv("KAFKA_BROKER", "localhost:9092"),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		AWSRegion:     getEnv("AWS_REGION", "us-east-1"),
		AWSAccessKey:  getEnv("AWS_ACCESS_KEY", ""),
		AWSSecretKey:  getEnv("AWS_SECRET_KEY", ""),
		S3Bucket:      getEnv("S3_BUCKET", "classroom-whiteboards"),
		Environment:   getEnv("ENVIRONMENT", "development"),
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
