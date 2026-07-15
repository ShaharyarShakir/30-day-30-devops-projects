package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Kafka    KafkaConfig    `yaml:"kafka"`
	Storage  StorageConfig  `yaml:"storage"`
	FFmpeg   FFmpegConfig   `yaml:"ffmpeg"`
	Worker   WorkerConfig   `yaml:"worker"`
	Telemetry TelemetryConfig `yaml:"telemetry"`
}

type ServerConfig struct {
	Environment string `yaml:"environment"`
	LogLevel    string `yaml:"log_level"`
}

type KafkaConfig struct {
	Brokers       []string `yaml:"brokers"`
	ConsumerGroup string   `yaml:"consumer_group"`
	Topics        struct {
		UploadCompleted   string `yaml:"upload_completed"`
		ProcessingProgress string `yaml:"processing_progress"`
		ProcessingFinished string `yaml:"processing_finished"`
		ProcessingFailed   string `yaml:"processing_failed"`
	} `yaml:"topics"`
}

type StorageConfig struct {
	Endpoint        string `yaml:"endpoint"`
	AccessKey       string `yaml:"access_key"`
	SecretKey       string `yaml:"secret_key"`
	Bucket          string `yaml:"bucket"`
	Region          string `yaml:"region"`
	UseSSL          bool   `yaml:"use_ssl"`
	ForcePathStyle  bool   `yaml:"force_path_style"`
}

type FFmpegConfig struct {
	Path           string        `yaml:"path"`
	FfprobePath    string        `yaml:"ffprobe_path"`
	Timeout        time.Duration `yaml:"timeout"`
	SegmentTime    int           `yaml:"segment_time"`
	Renditions     []Rendition   `yaml:"renditions"`
}

type Rendition struct {
	Name      string `yaml:"name"`
	Width     int    `yaml:"width"`
	Height    int    `yaml:"height"`
	Bitrate   string `yaml:"bitrate"`
	AudioRate string `yaml:"audio_rate"`
}

type WorkerConfig struct {
	TempDir        string        `yaml:"temp_dir"`
	MaxConcurrent  int           `yaml:"max_concurrent"`
	RetryAttempts  int           `yaml:"retry_attempts"`
	RetryDelay     time.Duration `yaml:"retry_delay"`
	CleanupOnExit  bool          `yaml:"cleanup_on_exit"`
}

type TelemetryConfig struct {
	Enabled     bool   `yaml:"enabled"`
	ServiceName string `yaml:"service_name"`
	Jaeger      struct {
		Endpoint string `yaml:"endpoint"`
	} `yaml:"jaeger"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	// Override with environment variables
	if val := os.Getenv("KAFKA_BROKERS"); val != "" {
		cfg.Kafka.Brokers = []string{val}
	}
	if val := os.Getenv("STORAGE_ENDPOINT"); val != "" {
		cfg.Storage.Endpoint = val
	}
	if val := os.Getenv("STORAGE_ACCESS_KEY"); val != "" {
		cfg.Storage.AccessKey = val
	}
	if val := os.Getenv("STORAGE_SECRET_KEY"); val != "" {
		cfg.Storage.SecretKey = val
	}
	if val := os.Getenv("STORAGE_BUCKET"); val != "" {
		cfg.Storage.Bucket = val
	}

	return &cfg, nil
}

func (c *Config) Validate() error {
	if len(c.Kafka.Brokers) == 0 {
		return fmt.Errorf("kafka brokers are required")
	}
	if c.Kafka.ConsumerGroup == "" {
		return fmt.Errorf("kafka consumer group is required")
	}
	if c.Storage.Endpoint == "" {
		return fmt.Errorf("storage endpoint is required")
	}
	if c.Storage.AccessKey == "" {
		return fmt.Errorf("storage access key is required")
	}
	if c.Storage.SecretKey == "" {
		return fmt.Errorf("storage secret key is required")
	}
	if c.Storage.Bucket == "" {
		return fmt.Errorf("storage bucket is required")
	}
	if c.FFmpeg.Path == "" {
		c.FFmpeg.Path = "ffmpeg"
	}
	if c.FFmpeg.FfprobePath == "" {
		c.FFmpeg.FfprobePath = "ffprobe"
	}
	if c.Worker.TempDir == "" {
		c.Worker.TempDir = "/tmp/media"
	}
	return nil
}
