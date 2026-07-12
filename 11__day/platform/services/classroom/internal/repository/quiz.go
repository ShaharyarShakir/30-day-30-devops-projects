package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/platform/classroom/internal/models"
)

type QuizRepository struct {
	db *sqlx.DB
}

func NewQuizRepository(db *sqlx.DB) *QuizRepository {
	return &QuizRepository{db: db}
}

func (r *QuizRepository) Create(ctx context.Context, quiz *models.Quiz) error {
	query := `
		INSERT INTO quizzes (id, session_id, title, description, questions, time_limit, allow_review, show_results, status, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at
	`
	
	quiz.ID = uuid.New()
	quiz.CreatedAt = time.Now()
	quiz.UpdatedAt = time.Now()
	
	questionsJSON, err := json.Marshal(quiz.Questions)
	if err != nil {
		return err
	}
	
	return r.db.QueryRowContext(ctx, query,
		quiz.ID,
		quiz.SessionID,
		quiz.Title,
		quiz.Description,
		questionsJSON,
		quiz.TimeLimit,
		quiz.AllowReview,
		quiz.ShowResults,
		quiz.Status,
		quiz.CreatedBy,
		quiz.CreatedAt,
		quiz.UpdatedAt,
	).Scan(&quiz.ID, &quiz.CreatedAt, &quiz.UpdatedAt)
}

func (r *QuizRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Quiz, error) {
	query := `
		SELECT id, session_id, title, description, questions, time_limit, allow_review, show_results, status,
		       created_by, published_at, completed_at, created_at, updated_at
		FROM quizzes
		WHERE id = $1
	`
	
	var quiz models.Quiz
	var questionsJSON string
	err := r.db.GetContext(ctx, &quiz, query, id)
	if err != nil {
		return nil, err
	}
	
	if err := json.Unmarshal([]byte(questionsJSON), &quiz.Questions); err != nil {
		return nil, err
	}
	
	return &quiz, nil
}

func (r *QuizRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]*models.Quiz, error) {
	query := `
		SELECT id, session_id, title, description, questions, time_limit, allow_review, show_results, status,
		       created_by, published_at, completed_at, created_at, updated_at
		FROM quizzes
		WHERE session_id = $1
		ORDER BY created_at DESC
	`
	
	var quizzes []*models.Quiz
	rows, err := r.db.QueryContext(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	for rows.Next() {
		var quiz models.Quiz
		var questionsJSON string
		if err := rows.Scan(
			&quiz.ID, &quiz.SessionID, &quiz.Title, &quiz.Description, &questionsJSON,
			&quiz.TimeLimit, &quiz.AllowReview, &quiz.ShowResults, &quiz.Status,
			&quiz.CreatedBy, &quiz.PublishedAt, &quiz.CompletedAt, &quiz.CreatedAt, &quiz.UpdatedAt,
		); err != nil {
			return nil, err
		}
		
		if err := json.Unmarshal([]byte(questionsJSON), &quiz.Questions); err != nil {
			return nil, err
		}
		
		quizzes = append(quizzes, &quiz)
	}
	
	return quizzes, nil
}

func (r *QuizRepository) GetActiveBySessionID(ctx context.Context, sessionID uuid.UUID) (*models.Quiz, error) {
	query := `
		SELECT id, session_id, title, description, questions, time_limit, allow_review, show_results, status,
		       created_by, published_at, completed_at, created_at, updated_at
		FROM quizzes
		WHERE session_id = $1 AND status = 'active'
		ORDER BY published_at DESC
		LIMIT 1
	`
	
	var quiz models.Quiz
	var questionsJSON string
	err := r.db.GetContext(ctx, &quiz, query, sessionID)
	if err != nil {
		return nil, err
	}
	
	if err := json.Unmarshal([]byte(questionsJSON), &quiz.Questions); err != nil {
		return nil, err
	}
	
	return &quiz, nil
}

func (r *QuizRepository) Update(ctx context.Context, quiz *models.Quiz) error {
	query := `
		UPDATE quizzes
		SET title = COALESCE($2, title),
		    description = COALESCE($3, description),
		    questions = COALESCE($4, questions),
		    time_limit = COALESCE($5, time_limit),
		    allow_review = COALESCE($6, allow_review),
		    show_results = COALESCE($7, show_results),
		    status = COALESCE($8, status),
		    published_at = COALESCE($9, published_at),
		    completed_at = COALESCE($10, completed_at),
		    updated_at = $11
		WHERE id = $1
		RETURNING updated_at
	`
	
	quiz.UpdatedAt = time.Now()
	
	questionsJSON, err := json.Marshal(quiz.Questions)
	if err != nil {
		return err
	}
	
	return r.db.QueryRowContext(ctx, query,
		quiz.ID,
		quiz.Title,
		quiz.Description,
		questionsJSON,
		quiz.TimeLimit,
		quiz.AllowReview,
		quiz.ShowResults,
		quiz.Status,
		quiz.PublishedAt,
		quiz.CompletedAt,
		quiz.UpdatedAt,
	).Scan(&quiz.UpdatedAt)
}

func (r *QuizRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `
		UPDATE quizzes
		SET status = $2, updated_at = $3
		WHERE id = $1
	`
	
	_, err := r.db.ExecContext(ctx, query, id, status, time.Now())
	return err
}

func (r *QuizRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM quizzes WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *QuizRepository) CreateSubmission(ctx context.Context, submission *models.QuizSubmission) error {
	query := `
		INSERT INTO quiz_submissions (id, quiz_id, user_id, answers, score, time_taken, submitted_at, graded_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (quiz_id, user_id)
		DO UPDATE SET answers = $4, score = $5, time_taken = $6, submitted_at = $7, graded_at = $8
		RETURNING id, submitted_at
	`
	
	submission.ID = uuid.New()
	submission.SubmittedAt = time.Now()
	
	answersJSON, err := json.Marshal(submission.Answers)
	if err != nil {
		return err
	}
	
	return r.db.QueryRowContext(ctx, query,
		submission.ID,
		submission.QuizID,
		submission.UserID,
		answersJSON,
		submission.Score,
		submission.TimeTaken,
		submission.SubmittedAt,
		submission.GradedAt,
	).Scan(&submission.ID, &submission.SubmittedAt)
}

func (r *QuizRepository) GetSubmissions(ctx context.Context, quizID uuid.UUID) ([]*models.QuizSubmission, error) {
	query := `
		SELECT id, quiz_id, user_id, answers, score, time_taken, submitted_at, graded_at
		FROM quiz_submissions
		WHERE quiz_id = $1
		ORDER BY submitted_at ASC
	`
	
	var submissions []*models.QuizSubmission
	rows, err := r.db.QueryContext(ctx, query, quizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	for rows.Next() {
		var submission models.QuizSubmission
		var answersJSON string
		if err := rows.Scan(
			&submission.ID, &submission.QuizID, &submission.UserID, &answersJSON,
			&submission.Score, &submission.TimeTaken, &submission.SubmittedAt, &submission.GradedAt,
		); err != nil {
			return nil, err
		}
		
		if err := json.Unmarshal([]byte(answersJSON), &submission.Answers); err != nil {
			return nil, err
		}
		
		submissions = append(submissions, &submission)
	}
	
	return submissions, nil
}

func (r *QuizRepository) GetUserSubmission(ctx context.Context, quizID, userID uuid.UUID) (*models.QuizSubmission, error) {
	query := `
		SELECT id, quiz_id, user_id, answers, score, time_taken, submitted_at, graded_at
		FROM quiz_submissions
		WHERE quiz_id = $1 AND user_id = $2
	`
	
	var submission models.QuizSubmission
	var answersJSON string
	err := r.db.GetContext(ctx, &submission, query, quizID, userID)
	if err != nil {
		return nil, err
	}
	
	if err := json.Unmarshal([]byte(answersJSON), &submission.Answers); err != nil {
		return nil, err
	}
	
	return &submission, nil
}

func (r *QuizRepository) GetResults(ctx context.Context, quizID uuid.UUID) ([]*models.QuizResult, error) {
	query := `
		SELECT user_id, score, time_taken, submitted_at
		FROM quiz_submissions
		WHERE quiz_id = $1 AND score IS NOT NULL
		ORDER BY score DESC, submitted_at ASC
	`
	
	var results []*models.QuizResult
	err := r.db.SelectContext(ctx, &results, query, quizID)
	if err != nil {
		return nil, err
	}
	
	return results, nil
}

func (r *QuizRepository) GetAverageScore(ctx context.Context, quizID uuid.UUID) (float64, error) {
	query := `
		SELECT AVG(score)
		FROM quiz_submissions
		WHERE quiz_id = $1 AND score IS NOT NULL
	`
	
	var avgScore sql.NullFloat64
	err := r.db.GetContext(ctx, &avgScore, query, quizID)
	if err != nil {
		return 0, err
	}
	
	if !avgScore.Valid {
		return 0, nil
	}
	
	return avgScore.Float64, nil
}
