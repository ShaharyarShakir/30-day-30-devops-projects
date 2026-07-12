package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/platform/classroom/internal/models"
)

type PollRepository struct {
	db *sqlx.DB
}

func NewPollRepository(db *sqlx.DB) *PollRepository {
	return &PollRepository{db: db}
}

func (r *PollRepository) Create(ctx context.Context, poll *models.Poll) error {
	query := `
		INSERT INTO polls (id, session_id, question, options, allow_multiple, is_anonymous, status, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at
	`
	
	poll.ID = uuid.New()
	poll.CreatedAt = time.Now()
	poll.UpdatedAt = time.Now()
	
	optionsJSON, err := json.Marshal(poll.Options)
	if err != nil {
		return err
	}
	
	return r.db.QueryRowContext(ctx, query,
		poll.ID,
		poll.SessionID,
		poll.Question,
		optionsJSON,
		poll.AllowMultiple,
		poll.IsAnonymous,
		poll.Status,
		poll.CreatedBy,
		poll.CreatedAt,
		poll.UpdatedAt,
	).Scan(&poll.ID, &poll.CreatedAt, &poll.UpdatedAt)
}

func (r *PollRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Poll, error) {
	query := `
		SELECT id, session_id, question, options, allow_multiple, is_anonymous, status, 
		       created_by, published_at, completed_at, created_at, updated_at
		FROM polls
		WHERE id = $1
	`
	
	var poll models.Poll
	var optionsJSON string
	err := r.db.GetContext(ctx, &poll, query, id)
	if err != nil {
		return nil, err
	}
	
	if err := json.Unmarshal([]byte(optionsJSON), &poll.Options); err != nil {
		return nil, err
	}
	
	return &poll, nil
}

func (r *PollRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]*models.Poll, error) {
	query := `
		SELECT id, session_id, question, options, allow_multiple, is_anonymous, status,
		       created_by, published_at, completed_at, created_at, updated_at
		FROM polls
		WHERE session_id = $1
		ORDER BY created_at DESC
	`
	
	var polls []*models.Poll
	rows, err := r.db.QueryContext(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	for rows.Next() {
		var poll models.Poll
		var optionsJSON string
		if err := rows.Scan(
			&poll.ID, &poll.SessionID, &poll.Question, &optionsJSON, &poll.AllowMultiple,
			&poll.IsAnonymous, &poll.Status, &poll.CreatedBy, &poll.PublishedAt,
			&poll.CompletedAt, &poll.CreatedAt, &poll.UpdatedAt,
		); err != nil {
			return nil, err
		}
		
		if err := json.Unmarshal([]byte(optionsJSON), &poll.Options); err != nil {
			return nil, err
		}
		
		polls = append(polls, &poll)
	}
	
	return polls, nil
}

func (r *PollRepository) GetActiveBySessionID(ctx context.Context, sessionID uuid.UUID) (*models.Poll, error) {
	query := `
		SELECT id, session_id, question, options, allow_multiple, is_anonymous, status,
		       created_by, published_at, completed_at, created_at, updated_at
		FROM polls
		WHERE session_id = $1 AND status = 'active'
		ORDER BY published_at DESC
		LIMIT 1
	`
	
	var poll models.Poll
	var optionsJSON string
	err := r.db.GetContext(ctx, &poll, query, sessionID)
	if err != nil {
		return nil, err
	}
	
	if err := json.Unmarshal([]byte(optionsJSON), &poll.Options); err != nil {
		return nil, err
	}
	
	return &poll, nil
}

func (r *PollRepository) Update(ctx context.Context, poll *models.Poll) error {
	query := `
		UPDATE polls
		SET question = COALESCE($2, question),
		    options = COALESCE($3, options),
		    allow_multiple = COALESCE($4, allow_multiple),
		    is_anonymous = COALESCE($5, is_anonymous),
		    status = COALESCE($6, status),
		    published_at = COALESCE($7, published_at),
		    completed_at = COALESCE($8, completed_at),
		    updated_at = $9
		WHERE id = $1
		RETURNING updated_at
	`
	
	poll.UpdatedAt = time.Now()
	
	optionsJSON, err := json.Marshal(poll.Options)
	if err != nil {
		return err
	}
	
	return r.db.QueryRowContext(ctx, query,
		poll.ID,
		poll.Question,
		optionsJSON,
		poll.AllowMultiple,
		poll.IsAnonymous,
		poll.Status,
		poll.PublishedAt,
		poll.CompletedAt,
		poll.UpdatedAt,
	).Scan(&poll.UpdatedAt)
}

func (r *PollRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `
		UPDATE polls
		SET status = $2, updated_at = $3
		WHERE id = $1
	`
	
	_, err := r.db.ExecContext(ctx, query, id, status, time.Now())
	return err
}

func (r *PollRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM polls WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *PollRepository) CreateVote(ctx context.Context, vote *models.PollVote) error {
	query := `
		INSERT INTO poll_votes (id, poll_id, user_id, option_ids, voted_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (poll_id, user_id) 
		DO UPDATE SET option_ids = $4, voted_at = $5
		RETURNING id, voted_at
	`
	
	vote.ID = uuid.New()
	vote.VotedAt = time.Now()
	
	optionIDsJSON, err := json.Marshal(vote.OptionIDs)
	if err != nil {
		return err
	}
	
	return r.db.QueryRowContext(ctx, query,
		vote.ID,
		vote.PollID,
		vote.UserID,
		optionIDsJSON,
		vote.VotedAt,
	).Scan(&vote.ID, &vote.VotedAt)
}

func (r *PollRepository) GetVotes(ctx context.Context, pollID uuid.UUID) ([]*models.PollVote, error) {
	query := `
		SELECT id, poll_id, user_id, option_ids, voted_at
		FROM poll_votes
		WHERE poll_id = $1
		ORDER BY voted_at ASC
	`
	
	var votes []*models.PollVote
	rows, err := r.db.QueryContext(ctx, query, pollID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	for rows.Next() {
		var vote models.PollVote
		var optionIDsJSON string
		if err := rows.Scan(&vote.ID, &vote.PollID, &vote.UserID, &optionIDsJSON, &vote.VotedAt); err != nil {
			return nil, err
		}
		
		if err := json.Unmarshal([]byte(optionIDsJSON), &vote.OptionIDs); err != nil {
			return nil, err
		}
		
		votes = append(votes, &vote)
	}
	
	return votes, nil
}

func (r *PollRepository) GetUserVote(ctx context.Context, pollID, userID uuid.UUID) (*models.PollVote, error) {
	query := `
		SELECT id, poll_id, user_id, option_ids, voted_at
		FROM poll_votes
		WHERE poll_id = $1 AND user_id = $2
	`
	
	var vote models.PollVote
	var optionIDsJSON string
	err := r.db.GetContext(ctx, &vote, query, pollID, userID)
	if err != nil {
		return nil, err
	}
	
	if err := json.Unmarshal([]byte(optionIDsJSON), &vote.OptionIDs); err != nil {
		return nil, err
	}
	
	return &vote, nil
}

func (r *PollRepository) GetVoteCount(ctx context.Context, pollID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM poll_votes WHERE poll_id = $1`
	
	var count int
	err := r.db.GetContext(ctx, &count, query, pollID)
	return count, err
}

func (r *PollRepository) GetResults(ctx context.Context, pollID uuid.UUID) ([]*models.PollResult, error) {
	poll, err := r.GetByID(ctx, pollID)
	if err != nil {
		return nil, err
	}

	var options []models.PollOption
	if err := json.Unmarshal([]byte(poll.Options), &options); err != nil {
		return nil, err
	}

	votes, err := r.GetVotes(ctx, pollID)
	if err != nil {
		return nil, err
	}

	optionCounts := make(map[string]int)
	for _, vote := range votes {
		var ids []string
		if err := json.Unmarshal([]byte(vote.OptionIDs), &ids); err == nil {
			for _, id := range ids {
				optionCounts[id]++
			}
		}
	}

	totalVotes := len(votes)
	results := make([]*models.PollResult, 0, len(options))
	for _, option := range options {
		count := optionCounts[option.ID]
		percentage := 0.0
		if totalVotes > 0 {
			percentage = float64(count) / float64(totalVotes) * 100
		}
		results = append(results, &models.PollResult{
			OptionID:   option.ID,
			OptionText: option.Text,
			VoteCount:  count,
			Percentage: percentage,
		})
	}
	return results, nil
}
