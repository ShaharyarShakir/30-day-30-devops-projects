package leaderboard

import "time"

type LeaderboardEntry struct {
	ID        string    `json:"id"`
	ProblemID *string   `json:"problem_id,omitempty"`
	UserID    string    `json:"user_id"`
	Score     int       `json:"score"`
	Runtime   *int64    `json:"runtime,omitempty"`
	Memory    *int64    `json:"memory,omitempty"`
	Language  *string   `json:"language,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

type LeaderboardRequest struct {
	ProblemID string `json:"problem_id,omitempty"`
	UserID    string `json:"user_id,omitempty"`
	Score     int    `json:"score"`
	Runtime   *int64 `json:"runtime,omitempty"`
	Memory    *int64 `json:"memory,omitempty"`
	Language  *string `json:"language,omitempty"`
}

type GetLeaderboardRequest struct {
	ProblemID string `json:"problem_id"`
	Limit     string `json:"limit,omitempty"`
	Offset    string `json:"offset,omitempty"`
	OrderBy   string `json:"order_by,omitempty"` // score, runtime, memory
}
