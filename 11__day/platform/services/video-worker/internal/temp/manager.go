package temp

import (
	"fmt"
	"os"
	"path/filepath"

	"go.uber.org/zap"
)

type Manager struct {
	baseDir string
	logger  *zap.Logger
}

func NewManager(baseDir string, logger *zap.Logger) (*Manager, error) {
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}

	return &Manager{
		baseDir: baseDir,
		logger:  logger,
	}, nil
}

func (m *Manager) CreateDir(mediaID string) (string, error) {
	dir := filepath.Join(m.baseDir, mediaID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create media directory: %w", err)
	}

	m.logger.Debug("Created temp directory", zap.String("media_id", mediaID), zap.String("path", dir))
	return dir, nil
}

func (m *Manager) GetDir(mediaID string) string {
	return filepath.Join(m.baseDir, mediaID)
}

func (m *Manager) GetOriginalPath(mediaID string) string {
	return filepath.Join(m.baseDir, mediaID, "original.mp4")
}

func (m *Manager) GetOutputPath(mediaID string) string {
	return filepath.Join(m.baseDir, mediaID, "output")
}

func (m *Manager) GetThumbnailsPath(mediaID string) string {
	return filepath.Join(m.baseDir, mediaID, "output", "thumbs")
}

func (m *Manager) Cleanup(mediaID string) error {
	dir := m.GetDir(mediaID)
	if err := os.RemoveAll(dir); err != nil {
		return fmt.Errorf("failed to cleanup temp directory: %w", err)
	}

	m.logger.Info("Cleaned up temp directory", zap.String("media_id", mediaID), zap.String("path", dir))
	return nil
}

func (m *Manager) CleanupAll() error {
	entries, err := os.ReadDir(m.baseDir)
	if err != nil {
		return fmt.Errorf("failed to read temp directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			dir := filepath.Join(m.baseDir, entry.Name())
			if err := os.RemoveAll(dir); err != nil {
				m.logger.Error("Failed to cleanup directory", zap.String("dir", dir), zap.Error(err))
			}
		}
	}

	m.logger.Info("Cleaned up all temp directories")
	return nil
}
