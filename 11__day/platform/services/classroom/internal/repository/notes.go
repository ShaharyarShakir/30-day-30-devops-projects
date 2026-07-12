package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/platform/classroom/internal/models"
)

type NotesRepository struct {
	db *sqlx.DB
}

func NewNotesRepository(db *sqlx.DB) *NotesRepository {
	return &NotesRepository{db: db}
}

func (r *NotesRepository) Create(ctx context.Context, notes *models.SharedNotes) error {
	query := `
		INSERT INTO shared_notes (id, session_id, title, content, crdt_state, is_public, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`
	
	notes.ID = uuid.New()
	notes.CreatedAt = time.Now()
	notes.UpdatedAt = time.Now()
	
	return r.db.QueryRowContext(ctx, query,
		notes.ID,
		notes.SessionID,
		notes.Title,
		notes.Content,
		notes.CRDTState,
		notes.IsPublic,
		notes.CreatedBy,
		notes.CreatedAt,
		notes.UpdatedAt,
	).Scan(&notes.ID, &notes.CreatedAt, &notes.UpdatedAt)
}

func (r *NotesRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.SharedNotes, error) {
	query := `
		SELECT id, session_id, title, content, crdt_state, is_public, created_by, 
		       created_at, updated_at, last_edited_by, last_edited_at
		FROM shared_notes
		WHERE id = $1
	`
	
	var notes models.SharedNotes
	err := r.db.GetContext(ctx, &notes, query, id)
	if err != nil {
		return nil, err
	}
	
	return &notes, nil
}

func (r *NotesRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]*models.SharedNotes, error) {
	query := `
		SELECT id, session_id, title, content, crdt_state, is_public, created_by,
		       created_at, updated_at, last_edited_by, last_edited_at
		FROM shared_notes
		WHERE session_id = $1
		ORDER BY created_at DESC
	`
	
	var notesList []*models.SharedNotes
	err := r.db.SelectContext(ctx, &notesList, query, sessionID)
	if err != nil {
		return nil, err
	}
	
	return notesList, nil
}

func (r *NotesRepository) GetPublicBySessionID(ctx context.Context, sessionID uuid.UUID) (*models.SharedNotes, error) {
	query := `
		SELECT id, session_id, title, content, crdt_state, is_public, created_by,
		       created_at, updated_at, last_edited_by, last_edited_at
		FROM shared_notes
		WHERE session_id = $1 AND is_public = true
		ORDER BY updated_at DESC
		LIMIT 1
	`
	
	var notes models.SharedNotes
	err := r.db.GetContext(ctx, &notes, query, sessionID)
	if err != nil {
		return nil, err
	}
	
	return &notes, nil
}

func (r *NotesRepository) Update(ctx context.Context, notes *models.SharedNotes) error {
	query := `
		UPDATE shared_notes
		SET title = COALESCE($2, title),
		    content = COALESCE($3, content),
		    crdt_state = COALESCE($4, crdt_state),
		    is_public = COALESCE($5, is_public),
		    last_edited_by = COALESCE($6, last_edited_by),
		    last_edited_at = COALESCE($7, last_edited_at),
		    updated_at = $8
		WHERE id = $1
		RETURNING updated_at
	`
	
	notes.UpdatedAt = time.Now()
	
	return r.db.QueryRowContext(ctx, query,
		notes.ID,
		notes.Title,
		notes.Content,
		notes.CRDTState,
		notes.IsPublic,
		notes.LastEditedBy,
		notes.LastEditedAt,
		notes.UpdatedAt,
	).Scan(&notes.UpdatedAt)
}

func (r *NotesRepository) UpdateCRDTState(ctx context.Context, id uuid.UUID, crdtState string, userID uuid.UUID) error {
	query := `
		UPDATE shared_notes
		SET crdt_state = $2, last_edited_by = $3, last_edited_at = $4, updated_at = $4
		WHERE id = $1
	`
	
	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, id, crdtState, userID, now)
	return err
}

func (r *NotesRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM shared_notes WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
