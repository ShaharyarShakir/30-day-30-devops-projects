package presence

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type Manager struct {
	client *redis.Client
}

func NewManager(client *redis.Client) *Manager {
	return &Manager{
		client: client,
	}
}

func (m *Manager) key(sessionID string) string {
	return fmt.Sprintf("session:%s:presence", sessionID)
}

// AddUser adds a user ID to the session's active presence set.
func (m *Manager) AddUser(ctx context.Context, sessionID string, userID string) error {
	err := m.client.SAdd(ctx, m.key(sessionID), userID).Err()
	if err != nil {
		return fmt.Errorf("failed to add user to presence: %w", err)
	}
	return nil
}

// RemoveUser removes a user ID from the session's active presence set.
func (m *Manager) RemoveUser(ctx context.Context, sessionID string, userID string) error {
	err := m.client.SRem(ctx, m.key(sessionID), userID).Err()
	if err != nil {
		return fmt.Errorf("failed to remove user from presence: %w", err)
	}
	return nil
}

// GetOnlineUsers retrieves all user IDs active in a session's presence.
func (m *Manager) GetOnlineUsers(ctx context.Context, sessionID string) ([]string, error) {
	users, err := m.client.SMembers(ctx, m.key(sessionID)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get active presence users: %w", err)
	}
	return users, nil
}
