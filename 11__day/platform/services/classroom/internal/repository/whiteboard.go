package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/platform/classroom/internal/models"
)

type WhiteboardRepository struct {
	db *sqlx.DB
}

func NewWhiteboardRepository(db *sqlx.DB) *WhiteboardRepository {
	return &WhiteboardRepository{db: db}
}

func (r *WhiteboardRepository) Create(ctx context.Context, whiteboard *models.Whiteboard) error {
	query := `
		INSERT INTO whiteboards (id, session_id, title, crdt_state, is_active, is_locked, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`
	
	whiteboard.ID = uuid.New()
	whiteboard.CreatedAt = time.Now()
	whiteboard.UpdatedAt = time.Now()
	
	return r.db.QueryRowContext(ctx, query,
		whiteboard.ID,
		whiteboard.SessionID,
		whiteboard.Title,
		whiteboard.CRDTState,
		whiteboard.IsActive,
		whiteboard.IsLocked,
		whiteboard.CreatedAt,
		whiteboard.UpdatedAt,
	).Scan(&whiteboard.ID, &whiteboard.CreatedAt, &whiteboard.UpdatedAt)
}

func (r *WhiteboardRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Whiteboard, error) {
	query := `
		SELECT id, session_id, title, crdt_state, snapshot_url, is_active, is_locked, locked_by, 
		       created_at, updated_at, last_snapshot_at
		FROM whiteboards
		WHERE id = $1
	`
	
	var whiteboard models.Whiteboard
	err := r.db.GetContext(ctx, &whiteboard, query, id)
	if err != nil {
		return nil, err
	}
	
	return &whiteboard, nil
}

func (r *WhiteboardRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]*models.Whiteboard, error) {
	query := `
		SELECT id, session_id, title, crdt_state, snapshot_url, is_active, is_locked, locked_by,
		       created_at, updated_at, last_snapshot_at
		FROM whiteboards
		WHERE session_id = $1
		ORDER BY created_at DESC
	`
	
	var whiteboards []*models.Whiteboard
	err := r.db.SelectContext(ctx, &whiteboards, query, sessionID)
	if err != nil {
		return nil, err
	}
	
	return whiteboards, nil
}

func (r *WhiteboardRepository) GetActiveBySessionID(ctx context.Context, sessionID uuid.UUID) (*models.Whiteboard, error) {
	query := `
		SELECT id, session_id, title, crdt_state, snapshot_url, is_active, is_locked, locked_by,
		       created_at, updated_at, last_snapshot_at
		FROM whiteboards
		WHERE session_id = $1 AND is_active = true
		ORDER BY created_at DESC
		LIMIT 1
	`
	
	var whiteboard models.Whiteboard
	err := r.db.GetContext(ctx, &whiteboard, query, sessionID)
	if err != nil {
		return nil, err
	}
	
	return &whiteboard, nil
}

func (r *WhiteboardRepository) Update(ctx context.Context, whiteboard *models.Whiteboard) error {
	query := `
		UPDATE whiteboards
		SET title = COALESCE($2, title),
		    crdt_state = COALESCE($3, crdt_state),
		    snapshot_url = COALESCE($4, snapshot_url),
		    is_locked = COALESCE($5, is_locked),
		    locked_by = COALESCE($6, locked_by),
		    last_snapshot_at = COALESCE($7, last_snapshot_at),
		    updated_at = $8
		WHERE id = $1
		RETURNING updated_at
	`
	
	whiteboard.UpdatedAt = time.Now()
	
	return r.db.QueryRowContext(ctx, query,
		whiteboard.ID,
		whiteboard.Title,
		whiteboard.CRDTState,
		whiteboard.SnapshotURL,
		whiteboard.IsLocked,
		whiteboard.LockedBy,
		whiteboard.LastSnapshotAt,
		whiteboard.UpdatedAt,
	).Scan(&whiteboard.UpdatedAt)
}

func (r *WhiteboardRepository) UpdateCRDTState(ctx context.Context, id uuid.UUID, crdtState string) error {
	query := `
		UPDATE whiteboards
		SET crdt_state = $2, updated_at = $3
		WHERE id = $1
	`
	
	_, err := r.db.ExecContext(ctx, query, id, crdtState, time.Now())
	return err
}

func (r *WhiteboardRepository) SetActive(ctx context.Context, id uuid.UUID, isActive bool) error {
	query := `
		UPDATE whiteboards
		SET is_active = $2, updated_at = $3
		WHERE id = $1
	`
	
	_, err := r.db.ExecContext(ctx, query, id, isActive, time.Now())
	return err
}

func (r *WhiteboardRepository) Lock(ctx context.Context, id uuid.UUID, lockedBy uuid.UUID, isLocked bool) error {
	query := `
		UPDATE whiteboards
		SET is_locked = $2, locked_by = $3, updated_at = $4
		WHERE id = $1
	`
	
	lockedByPtr := &lockedBy
	if !isLocked {
		lockedByPtr = nil
	}
	
	_, err := r.db.ExecContext(ctx, query, id, isLocked, lockedByPtr, time.Now())
	return err
}

func (r *WhiteboardRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM whiteboards WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *WhiteboardRepository) AddElement(ctx context.Context, element *models.WhiteboardElement) error {
	query := `
		INSERT INTO whiteboard_elements (id, whiteboard_id, element_type, element_data, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	
	element.ID = uuid.New()
	element.CreatedAt = time.Now()
	
	return r.db.QueryRowContext(ctx, query,
		element.ID,
		element.WhiteboardID,
		element.ElementType,
		element.ElementData,
		element.CreatedBy,
		element.CreatedAt,
	).Scan(&element.ID, &element.CreatedAt)
}

func (r *WhiteboardRepository) GetElements(ctx context.Context, whiteboardID uuid.UUID) ([]*models.WhiteboardElement, error) {
	query := `
		SELECT id, whiteboard_id, element_type, element_data, created_by, created_at
		FROM whiteboard_elements
		WHERE whiteboard_id = $1
		ORDER BY created_at ASC
	`
	
	var elements []*models.WhiteboardElement
	err := r.db.SelectContext(ctx, &elements, query, whiteboardID)
	if err != nil {
		return nil, err
	}
	
	return elements, nil
}

func (r *WhiteboardRepository) DeleteElements(ctx context.Context, whiteboardID uuid.UUID) error {
	query := `DELETE FROM whiteboard_elements WHERE whiteboard_id = $1`
	_, err := r.db.ExecContext(ctx, query, whiteboardID)
	return err
}
