package thumbnail

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/shaharyarshakir/video-worker/internal/ffmpeg"
	"go.uber.org/zap"
)

type Generator struct {
	transcoder *ffmpeg.Transcoder
	logger     *zap.Logger
}

func NewGenerator(transcoder *ffmpeg.Transcoder, logger *zap.Logger) *Generator {
	return &Generator{
		transcoder: transcoder,
		logger:     logger,
	}
}

func (g *Generator) Generate(input, outputDir string) error {
	g.logger.Info("Generating thumbnails",
		zap.String("input", input),
		zap.String("output_dir", outputDir),
	)

	// Create thumbnails directory
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create thumbnails directory: %w", err)
	}

	// Generate cover thumbnail (at 10% of video)
	coverPath := filepath.Join(outputDir, "cover.jpg")
	if err := g.generateThumbnail(input, coverPath, "00:00:01", "1280:720"); err != nil {
		return fmt.Errorf("failed to generate cover: %w", err)
	}

	// Generate preview thumbnail (at 50% of video)
	previewPath := filepath.Join(outputDir, "preview.jpg")
	if err := g.generateThumbnail(input, previewPath, "00:00:05", "1280:720"); err != nil {
		return fmt.Errorf("failed to generate preview: %w", err)
	}

	// Generate sprite thumbnail (for hover preview)
	spritePath := filepath.Join(outputDir, "sprite.jpg")
	if err := g.generateSprite(input, spritePath); err != nil {
		g.logger.Warn("Failed to generate sprite", zap.Error(err))
		// Non-fatal, continue
	}

	g.logger.Info("Thumbnails generated successfully",
		zap.String("output_dir", outputDir),
	)

	return nil
}

func (g *Generator) generateThumbnail(input, output, timestamp, scale string) error {
	args := []string{
		"-ss", timestamp,
		"-i", input,
		"-vframes", "1",
		"-vf", fmt.Sprintf("scale=%s", scale),
		"-q:v", "2",
		output,
	}

	return g.transcoder.Transcode(input, output, args)
}

func (g *Generator) generateSprite(input, output string) error {
	// Generate a sprite with 10 frames at regular intervals
	args := []string{
		"-i", input,
		"-vf", "fps=1/10,scale=320:-1,tile=10x1",
		"-frames:v", "1",
		"-q:v", "2",
		output,
	}

	return g.transcoder.Transcode(input, output, args)
}
