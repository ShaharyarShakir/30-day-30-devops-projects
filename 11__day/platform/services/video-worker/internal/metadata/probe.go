package metadata

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"go.uber.org/zap"
)

type VideoMetadata struct {
	Duration  float64 `json:"duration"`
	Width     int     `json:"width"`
	Height    int     `json:"height"`
	Codec     string  `json:"codec"`
	Bitrate   int     `json:"bitrate"`
	FrameRate float64 `json:"frame_rate"`
	AudioCodec string `json:"audio_codec"`
	AudioChannels int `json:"audio_channels"`
}

type ProbeResult struct {
	Streams []struct {
		CodecType string `json:"codec_type"`
		CodecName string `json:"codec_name"`
		Width     int    `json:"width"`
		Height    int    `json:"height"`
		BitRate   string `json:"bit_rate"`
		RFrameRate string `json:"r_frame_rate"`
		Channels  int    `json:"channels"`
	} `json:"streams"`
	Format struct {
		Duration string `json:"duration"`
		Size     string `json:"size"`
		BitRate  string `json:"bit_rate"`
	} `json:"format"`
}

type Prober struct {
	ffprobePath string
	logger      *zap.Logger
}

func NewProber(ffprobePath string, logger *zap.Logger) *Prober {
	return &Prober{
		ffprobePath: ffprobePath,
		logger:      logger,
	}
}

func (p *Prober) Probe(videoPath string) (*VideoMetadata, error) {
	p.logger.Info("Probing video", zap.String("path", videoPath))

	args := []string{
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		videoPath,
	}

	cmd := exec.Command(p.ffprobePath, args...)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ffprobe failed: %w", err)
	}

	var result ProbeResult
	if err := json.Unmarshal(output, &result); err != nil {
		return nil, fmt.Errorf("failed to parse ffprobe output: %w", err)
	}

	metadata, err := p.extractMetadata(&result)
	if err != nil {
		return nil, fmt.Errorf("failed to extract metadata: %w", err)
	}

	p.logger.Info("Video probed successfully",
		zap.Float64("duration", metadata.Duration),
		zap.Int("width", metadata.Width),
		zap.Int("height", metadata.Height),
		zap.String("codec", metadata.Codec),
	)

	return metadata, nil
}

func (p *Prober) extractMetadata(result *ProbeResult) (*VideoMetadata, error) {
	metadata := &VideoMetadata{}

	// Parse duration
	duration, err := strconv.ParseFloat(result.Format.Duration, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse duration: %w", err)
	}
	metadata.Duration = duration

	// Parse overall bitrate
	bitrate, err := strconv.Atoi(result.Format.BitRate)
	if err == nil {
		metadata.Bitrate = bitrate / 1000 // Convert to kbps
	}

	// Extract video and audio stream info
	for _, stream := range result.Streams {
		if stream.CodecType == "video" {
			metadata.Width = stream.Width
			metadata.Height = stream.Height
			metadata.Codec = stream.CodecName

			if stream.BitRate != "" {
				if br, err := strconv.Atoi(stream.BitRate); err == nil {
					metadata.Bitrate = br / 1000
				}
			}

			// Parse frame rate
			if stream.RFrameRate != "" {
				parts := strings.Split(stream.RFrameRate, "/")
				if len(parts) == 2 {
					numerator, _ := strconv.ParseFloat(parts[0], 64)
					denominator, _ := strconv.ParseFloat(parts[1], 64)
					if denominator > 0 {
						metadata.FrameRate = numerator / denominator
					}
				}
			}
		} else if stream.CodecType == "audio" {
			metadata.AudioCodec = stream.CodecName
			metadata.AudioChannels = stream.Channels
		}
	}

	// Validate required fields
	if metadata.Width == 0 || metadata.Height == 0 {
		return nil, fmt.Errorf("invalid video dimensions")
	}
	if metadata.Duration == 0 {
		return nil, fmt.Errorf("invalid duration")
	}
	if metadata.Codec == "" {
		return nil, fmt.Errorf("no video codec found")
	}

	return metadata, nil
}

func (p *Prober) Validate(metadata *VideoMetadata) error {
	// Check if video is valid
	if metadata.Duration < 1 {
		return fmt.Errorf("video too short: %.2f seconds", metadata.Duration)
	}
	if metadata.Duration > 86400 {
		return fmt.Errorf("video too long: %.2f seconds", metadata.Duration)
	}
	if metadata.Width < 320 || metadata.Height < 240 {
		return fmt.Errorf("resolution too low: %dx%d", metadata.Width, metadata.Height)
	}
	if metadata.Width > 7680 || metadata.Height > 4320 {
		return fmt.Errorf("resolution too high: %dx%d", metadata.Width, metadata.Height)
	}

	// Check codec support
	supportedCodecs := map[string]bool{
		"h264":  true,
		"hevc":  true,
		"vp9":   true,
		"avc1":  true,
		"mp4v":  true,
	}
	if !supportedCodecs[metadata.Codec] {
		return fmt.Errorf("unsupported codec: %s", metadata.Codec)
	}

	return nil
}
