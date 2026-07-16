package pipeline

import (
	"context"
	"fmt"

	"github.com/shaharyarshakir/video-worker/internal/config"
	"github.com/shaharyarshakir/video-worker/internal/ffmpeg"
	"github.com/shaharyarshakir/video-worker/internal/hls"
	"github.com/shaharyarshakir/video-worker/internal/kafka"
	"github.com/shaharyarshakir/video-worker/internal/metadata"
	"github.com/shaharyarshakir/video-worker/internal/storage"
	"github.com/shaharyarshakir/video-worker/internal/temp"
	"github.com/shaharyarshakir/video-worker/internal/thumbnail"
	"go.uber.org/zap"
)

type Pipeline struct {
	config        *config.Config
	storage       *storage.Client
	temp          *temp.Manager
	prober        *metadata.Prober
	transcoder    *ffmpeg.Transcoder
	hlsGenerator  *hls.Generator
	thumbGenerator *thumbnail.Generator
	kafkaProducer *kafka.Producer
	logger        *zap.Logger
}

func NewPipeline(
	cfg *config.Config,
	storageClient *storage.Client,
	tempMgr *temp.Manager,
	prober *metadata.Prober,
	transcoder *ffmpeg.Transcoder,
	hlsGen *hls.Generator,
	thumbGen *thumbnail.Generator,
	kafkaProd *kafka.Producer,
	logger *zap.Logger,
) *Pipeline {
	return &Pipeline{
		config:         cfg,
		storage:        storageClient,
		temp:           tempMgr,
		prober:         prober,
		transcoder:     transcoder,
		hlsGenerator:   hlsGen,
		thumbGenerator: thumbGen,
		kafkaProducer:  kafkaProd,
		logger:         logger,
	}
}

func (p *Pipeline) Process(ctx context.Context, event *kafka.UploadCompletedEvent) error {
	mediaID := event.MediaID
	p.logger.Info("Starting processing pipeline", zap.String("media_id", mediaID))

	// Create temp directory
	tempDir, err := p.temp.CreateDir(mediaID)
	if err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer p.cleanup(mediaID)

	// Progress: 5%
	if err := p.publishProgress(ctx, mediaID, 5, "Starting download"); err != nil {
		p.logger.Error("Failed to publish progress", zap.Error(err))
	}

	// Step 1: Download original
	originalPath := p.temp.GetOriginalPath(mediaID)
	if err := p.storage.Download(ctx, event.StorageKey, originalPath); err != nil {
		p.publishError(ctx, mediaID, fmt.Sprintf("Download failed: %v", err))
		return fmt.Errorf("failed to download video: %w", err)
	}

	// Progress: 15%
	if err := p.publishProgress(ctx, mediaID, 15, "Download complete, validating"); err != nil {
		p.logger.Error("Failed to publish progress", zap.Error(err))
	}

	// Step 2: Validate and probe
	videoMetadata, err := p.prober.Probe(originalPath)
	if err != nil {
		p.publishError(ctx, mediaID, fmt.Sprintf("Probe failed: %v", err))
		return fmt.Errorf("failed to probe video: %w", err)
	}

	if err := p.prober.Validate(videoMetadata); err != nil {
		p.publishError(ctx, mediaID, fmt.Sprintf("Validation failed: %v", err))
		return fmt.Errorf("video validation failed: %w", err)
	}

	// Progress: 25%
	if err := p.publishProgress(ctx, mediaID, 25, "Validation complete, transcoding"); err != nil {
		p.logger.Error("Failed to publish progress", zap.Error(err))
	}

	// Step 3: Generate HLS
	outputDir := p.temp.GetOutputPath(mediaID)
	if err := p.hlsGenerator.Generate(originalPath, outputDir, videoMetadata); err != nil {
		p.publishError(ctx, mediaID, fmt.Sprintf("HLS generation failed: %v", err))
		return fmt.Errorf("failed to generate HLS: %w", err)
	}

	// Progress: 60%
	if err := p.publishProgress(ctx, mediaID, 60, "HLS complete, generating thumbnails"); err != nil {
		p.logger.Error("Failed to publish progress", zap.Error(err))
	}

	// Step 4: Generate thumbnails
	thumbsDir := p.temp.GetThumbnailsPath(mediaID)
	if err := p.thumbGenerator.Generate(originalPath, thumbsDir); err != nil {
		p.logger.Warn("Thumbnail generation failed", zap.Error(err))
		// Non-fatal, continue
	}

	// Progress: 80%
	if err := p.publishProgress(ctx, mediaID, 80, "Thumbnails complete, uploading"); err != nil {
		p.logger.Error("Failed to publish progress", zap.Error(err))
	}

	// Step 5: Upload assets
	storagePrefix := fmt.Sprintf("media/%s", mediaID)
	if err := p.storage.UploadDirectory(ctx, storagePrefix, outputDir); err != nil {
		p.publishError(ctx, mediaID, fmt.Sprintf("Upload failed: %v", err))
		return fmt.Errorf("failed to upload assets: %w", err)
	}

	// Progress: 95%
	if err := p.publishProgress(ctx, mediaID, 95, "Upload complete"); err != nil {
		p.logger.Error("Failed to publish progress", zap.Error(err))
	}

	// Step 6: Publish success event
	finishedEvent := &kafka.ProcessingFinishedEvent{
		MediaID:   mediaID,
		Duration:  videoMetadata.Duration,
		Playlist:  fmt.Sprintf("media/%s/master.m3u8", mediaID),
		Width:     videoMetadata.Width,
		Height:    videoMetadata.Height,
		Codec:     videoMetadata.Codec,
		Bitrate:   videoMetadata.Bitrate,
		FrameRate: videoMetadata.FrameRate,
	}

	if err := p.kafkaProducer.PublishFinished(ctx, finishedEvent); err != nil {
		p.logger.Error("Failed to publish finished event", zap.Error(err))
	}

	// Progress: 100%
	if err := p.publishProgress(ctx, mediaID, 100, "Processing complete"); err != nil {
		p.logger.Error("Failed to publish progress", zap.Error(err))
	}

	p.logger.Info("Processing pipeline completed successfully", zap.String("media_id", mediaID))
	return nil
}

func (p *Pipeline) publishProgress(ctx context.Context, mediaID string, progress int, message string) error {
	event := &kafka.ProcessingProgressEvent{
		MediaID:  mediaID,
		Progress: progress,
		Message:  message,
	}
	return p.kafkaProducer.PublishProgress(ctx, event)
}

func (p *Pipeline) publishError(ctx context.Context, mediaID string, error string) {
	event := &kafka.ProcessingFailedEvent{
		MediaID: mediaID,
		Error:   error,
	}
	if err := p.kafkaProducer.PublishFailed(ctx, event); err != nil {
		p.logger.Error("Failed to publish failed event", zap.Error(err))
	}
}

func (p *Pipeline) cleanup(mediaID string) {
	if p.config.Worker.CleanupOnExit {
		if err := p.temp.Cleanup(mediaID); err != nil {
			p.logger.Error("Failed to cleanup temp files",
				zap.String("media_id", mediaID),
				zap.Error(err),
			)
		}
	}
}
