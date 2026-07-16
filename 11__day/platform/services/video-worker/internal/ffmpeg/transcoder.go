package ffmpeg

import (
	"context"
	"fmt"
	"os/exec"
	"time"

	"github.com/shaharyarshakir/video-worker/internal/config"
	"go.uber.org/zap"
)

type Transcoder struct {
	ffmpegPath string
	timeout    time.Duration
	logger     *zap.Logger
}

func NewTranscoder(cfg *config.FFmpegConfig, logger *zap.Logger) *Transcoder {
	return &Transcoder{
		ffmpegPath: cfg.Path,
		timeout:    cfg.Timeout,
		logger:     logger,
	}
}

func (t *Transcoder) Transcode(input, output string, args []string) error {
	t.logger.Info("Starting FFmpeg transcode",
		zap.String("input", input),
		zap.String("output", output),
	)

	cmdArgs := append([]string{
		"-i", input,
		"-y", // Overwrite output
	}, args...)
	cmdArgs = append(cmdArgs, output)

	cmd := exec.Command(t.ffmpegPath, cmdArgs...)

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), t.timeout)
	defer cancel()

	cmd = exec.CommandContext(ctx, t.ffmpegPath, cmdArgs...)

	outputBytes, err := cmd.CombinedOutput()
	if err != nil {
		t.logger.Error("FFmpeg failed",
			zap.String("input", input),
			zap.String("output", output),
			zap.Error(err),
			zap.String("output", string(outputBytes)),
		)
		return fmt.Errorf("ffmpeg failed: %w, output: %s", err, string(outputBytes))
	}

	t.logger.Info("FFmpeg transcode completed",
		zap.String("input", input),
		zap.String("output", output),
	)

	return nil
}

func (t *Transcoder) GenerateVideoArgs(width, height int, bitrate, audioRate string) []string {
	return []string{
		"-c:v", "libx264",
		"-preset", "medium",
		"-crf", "23",
		"-maxrate", bitrate,
		"-bufsize", bitrate + "k",
		"-vf", fmt.Sprintf("scale=%d:%d", width, height),
		"-c:a", "aac",
		"-b:a", audioRate,
		"-ar", "48000",
		"-movflags", "+faststart",
	}
}
