package hls

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/shaharyarshakir/video-worker/internal/config"
	"github.com/shaharyarshakir/video-worker/internal/ffmpeg"
	"github.com/shaharyarshakir/video-worker/internal/metadata"
	"go.uber.org/zap"
)

type Generator struct {
	transcoder *ffmpeg.Transcoder
	config     *config.FFmpegConfig
	logger     *zap.Logger
}

func NewGenerator(transcoder *ffmpeg.Transcoder, cfg *config.FFmpegConfig, logger *zap.Logger) *Generator {
	return &Generator{
		transcoder: transcoder,
		config:     cfg,
		logger:     logger,
	}
}

func (g *Generator) Generate(input, outputDir string, metadata *metadata.VideoMetadata) error {
	g.logger.Info("Generating HLS",
		zap.String("input", input),
		zap.String("output_dir", outputDir),
	)

	// Create output directory
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Determine which renditions to generate
	renditions := g.selectRenditions(metadata)
	g.logger.Info("Selected renditions",
		zap.Int("count", len(renditions)),
		zap.Any("renditions", renditions),
	)

	// Generate each rendition
	for i, rendition := range renditions {
		renditionDir := filepath.Join(outputDir, rendition.Name)
		if err := os.MkdirAll(renditionDir, 0755); err != nil {
			return fmt.Errorf("failed to create rendition directory: %w", err)
		}

		playlistPath := filepath.Join(renditionDir, "index.m3u8")
		if err := g.generateRendition(input, playlistPath, rendition); err != nil {
			return fmt.Errorf("failed to generate rendition %s: %w", rendition.Name, err)
		}

		g.logger.Info("Generated rendition",
			zap.String("name", rendition.Name),
			zap.Int("index", i+1),
			zap.Int("total", len(renditions)),
		)
	}

	// Generate master playlist
	if err := g.generateMasterPlaylist(outputDir, renditions); err != nil {
		return fmt.Errorf("failed to generate master playlist: %w", err)
	}

	g.logger.Info("HLS generation completed",
		zap.String("output_dir", outputDir),
	)

	return nil
}

func (g *Generator) selectRenditions(metadata *metadata.VideoMetadata) []config.Rendition {
	var selected []config.Rendition

	for _, rendition := range g.config.Renditions {
		// Only generate renditions that don't exceed source resolution
		if rendition.Width <= metadata.Width && rendition.Height <= metadata.Height {
			selected = append(selected, rendition)
		}
	}

	// Ensure at least one rendition
	if len(selected) == 0 {
		// Use the lowest available rendition
		selected = []config.Rendition{g.config.Renditions[len(g.config.Renditions)-1]}
	}

	return selected
}

func (g *Generator) generateRendition(input, output string, rendition config.Rendition) error {
	segmentTime := g.config.SegmentTime
	if segmentTime == 0 {
		segmentTime = 6
	}

	args := []string{
		"-c:v", "libx264",
		"-preset", "medium",
		"-crf", "23",
		"-maxrate", rendition.Bitrate,
		"-bufsize", rendition.Bitrate + "k",
		"-vf", fmt.Sprintf("scale=%d:%d", rendition.Width, rendition.Height),
		"-c:a", "aac",
		"-b:a", rendition.AudioRate,
		"-ar", "48000",
		"-f", "hls",
		"-hls_time", fmt.Sprintf("%d", segmentTime),
		"-hls_playlist_type", "vod",
		"-hls_segment_filename", strings.Replace(output, "index.m3u8", "segment_%03d.ts", 1),
		output,
	}

	return g.transcoder.Transcode(input, output, args)
}

func (g *Generator) generateMasterPlaylist(outputDir string, renditions []config.Rendition) error {
	masterPath := filepath.Join(outputDir, "master.m3u8")

	var lines []string
	lines = append(lines, "#EXTM3U")
	lines = append(lines, "#EXT-X-VERSION:3")

	for _, rendition := range renditions {
		bandwidth := g.parseBandwidth(rendition.Bitrate)
		lines = append(lines, fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d", bandwidth, rendition.Width, rendition.Height))
		lines = append(lines, fmt.Sprintf("%s/index.m3u8", rendition.Name))
	}

	content := strings.Join(lines, "\n")
	if err := os.WriteFile(masterPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write master playlist: %w", err)
	}

	g.logger.Info("Generated master playlist", zap.String("path", masterPath))
	return nil
}

func (g *Generator) parseBandwidth(bitrate string) int {
	// Parse bitrate string like "5000k" to integer
	bitrate = strings.TrimSuffix(bitrate, "k")
	bandwidth := 0
	fmt.Sscanf(bitrate, "%d", &bandwidth)
	return bandwidth * 1000 // Convert to bps
}
