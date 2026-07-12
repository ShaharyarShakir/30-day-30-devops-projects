package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"github.com/platform/classroom/internal/models"
)

type HandRaiseRepository struct {
	db    *sqlx.DB
	redis *redis.Client
}

func NewHandRaiseRepository(db *sqlx.DB, redis *redis.Client) *HandRaiseRepository {
	return &HandRaiseRepository{db: db, redis: redis}
}

func (r *HandRaiseRepository) Create(ctx context.Context, handRaise *models.HandRaise) error {
	query := `
		INSERT INTO hand_raises (id, session_id, user_id, status, queue_position, raised_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, queue_position, raised_at, updated_at
	`
	
	handRaise.ID = uuid.New()
	handRaise.RaisedAt = time.Now()
	handRaise.UpdatedAt = time.Now()
	
	// Get next queue position
	queuePosition, err := r.getNextQueuePosition(ctx, handRaise.SessionID)
	if err != nil {
		return err
	}
	handRaise.QueuePosition = &queuePosition
	
	return r.db.QueryRowContext(ctx, query,
		handRaise.ID,
		handRaise.SessionID,
		handRaise.UserID,
		handRaise.Status,
		handRaise.QueuePosition,
		handRaise.RaisedAt,
		handRaise.UpdatedAt,
	).Scan(&handRaise.ID, &handRaise.QueuePosition, &handRaise.RaisedAt, &handRaise.UpdatedAt)
}

func (r *HandRaiseRepository) getNextQueuePosition(ctx context.Context, sessionID uuid.UUID) (int, error) {
	query := `
		SELECT COALESCE(MAX(queue_position), 0) + 1
		FROM hand_raises
		WHERE session_id = $1 AND status = 'pending'
	`
	
	var position int
	err := r.db.GetContext(ctx, &position, query, sessionID)
	return position, err
}

func (r *HandRaiseRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.HandRaise, error) {
	query := `
		SELECT id, session_id, user_id, status, queue_position, approved_by, approved_at, 
		       rejected_by, rejected_at, raised_at, updated_at
		FROM hand_raises
		WHERE id = $1
	`
	
	var handRaise models.HandRaise
	err := r.db.GetContext(ctx, &handRaise, query, id)
	if err != nil {
		return nil, err
	}
	
	return &handRaise, nil
}

func (r *HandRaiseRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]*models.HandRaise, error) {
	query := `
		SELECT id, session_id, user_id, status, queue_position, approved_by, approved_at,
		       rejected_by, rejected_at, raised_at, updated_at
		FROM hand_raises
		WHERE session_id = $1
		ORDER BY queue_position ASC NULLS LAST, raised_at DESC
	`
	
	var handRaises []*models.HandRaise
	err := r.db.SelectContext(ctx, &handRaises, query, sessionID)
	if err != nil {
		return nil, err
	}
	
	return handRaises, nil
}

func (r *HandRaiseRepository) GetPendingQueue(ctx context.Context, sessionID uuid.UUID) ([]*models.HandRaise, error) {
	query := `
		SELECT id, session_id, user_id, status, queue_position, approved_by, approved_at,
		       rejected_by, rejected_at, raised_at, updated_at
		FROM hand_raises
		WHERE session_id = $1 AND status = 'pending'
		ORDER BY queue_position ASC
	`
	
	var handRaises []*models.HandRaise
	err := r.db.SelectContext(ctx, &handRaises, query, sessionID)
	if err != nil {
		return nil, err
	}
	
	return handRaises, nil
}

func (r *HandRaiseRepository) GetUserActiveHandRaise(ctx context.Context, sessionID, userID uuid.UUID) (*models.HandRaise, error) {
	query := `
		SELECT id, session_id, user_id, status, queue_position, approved_by, approved_at,
		       rejected_by, rejected_at, raised_at, updated_at
		FROM hand_raises
		WHERE session_id = $1 AND user_id = $2 AND status IN ('pending', 'approved')
		ORDER BY raised_at DESC
		LIMIT 1
	`
	
	var handRaise models.HandRaise
	err := r.db.GetContext(ctx, &handRaise, query, sessionID, userID)
	if err != nil {
		return nil, err
	}
	
	return &handRaise, nil
}

func (r *HandRaiseRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, approvedBy, rejectedBy *uuid.UUID) error {
	query := `
		UPDATE hand_raises
		SET status = $2,
		    approved_by = COALESCE($3, approved_by),
		    rejected_by = COALESCE($4, rejected_by),
		    approved_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE approved_at END,
		    rejected_at = CASE WHEN $2 = 'rejected' THEN NOW() ELSE rejected_at END,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`
	
	return r.db.QueryRowContext(ctx, query, id, status, approvedBy, rejectedBy).Scan(new(time.Time))
}

func (r *HandRaiseRepository) Cancel(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE hand_raises
		SET status = 'cancelled', updated_at = NOW()
		WHERE id = $1
	`
	
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *HandRaiseRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM hand_raises WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *HandRaiseRepository) ReorderQueue(ctx context.Context, sessionID uuid.UUID) error {
	// Reorder pending hand raises after cancellation or approval
	query := `
		WITH numbered AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY raised_at ASC) as new_position
			FROM hand_raises
			WHERE session_id = $1 AND status = 'pending'
		)
		UPDATE hand_raises
		SET queue_position = numbered.new_position, updated_at = NOW()
		FROM numbered
		WHERE hand_raises.id = numbered.id
	`
	
	_, err := r.db.ExecContext(ctx, query, sessionID)
	return err
}
