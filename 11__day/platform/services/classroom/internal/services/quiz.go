package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/platform/classroom/internal/metrics"
	"github.com/platform/classroom/internal/models"
	"github.com/platform/classroom/internal/repository"
)

type QuizService struct {
	repo          *repository.QuizRepository
	redis         *redis.Client
	kafkaProducer *repository.KafkaProducer
	metrics       *metrics.Collector
	logger        *zerolog.Logger
}

func NewQuizService(
	repo *repository.QuizRepository,
	redis *redis.Client,
	kafkaProducer *repository.KafkaProducer,
	metrics *metrics.Collector,
	logger *zerolog.Logger,
) *QuizService {
	return &QuizService{
		repo:          repo,
		redis:         redis,
		kafkaProducer: kafkaProducer,
		metrics:       metrics,
		logger:        logger,
	}
}

func (s *QuizService) CreateQuiz(ctx context.Context, req *models.CreateQuizRequest, userID uuid.UUID) (*models.Quiz, error) {
	questionsJSON, err := json.Marshal(req.Questions)
	if err != nil {
		return nil, err
	}

	quiz := &models.Quiz{
		SessionID:   req.SessionID,
		Title:       req.Title,
		Description: req.Description,
		Questions:   string(questionsJSON),
		TimeLimit:   req.TimeLimit,
		AllowReview: req.AllowReview,
		ShowResults: req.ShowResults,
		Status:      "draft",
		CreatedBy:   userID,
	}

	if err := s.repo.Create(ctx, quiz); err != nil {
		s.logger.Error().Err(err).Str("session_id", req.SessionID.String()).Msg("Failed to create quiz")
		return nil, err
	}

	s.metrics.IncrementQuizCreated()
	s.logger.Info().Str("quiz_id", quiz.ID.String()).Str("session_id", quiz.SessionID.String()).Msg("Quiz created")

	return quiz, nil
}

func (s *QuizService) GetQuiz(ctx context.Context, id uuid.UUID) (*models.Quiz, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *QuizService) GetSessionQuizzes(ctx context.Context, sessionID uuid.UUID) ([]*models.Quiz, error) {
	return s.repo.GetBySessionID(ctx, sessionID)
}

func (s *QuizService) GetActiveQuiz(ctx context.Context, sessionID uuid.UUID) (*models.Quiz, error) {
	return s.repo.GetActiveBySessionID(ctx, sessionID)
}

func (s *QuizService) UpdateQuiz(ctx context.Context, id uuid.UUID, req *models.UpdateQuizRequest, userID uuid.UUID) (*models.Quiz, error) {
	quiz, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Only allow updates if quiz is in draft status
	if quiz.Status != "draft" {
		return nil, fmt.Errorf("can only update quizzes in draft status")
	}

	if req.Title != nil {
		quiz.Title = *req.Title
	}
	if req.Description != nil {
		quiz.Description = *req.Description
	}
	if req.Questions != nil {
		questionsJSON, err := json.Marshal(*req.Questions)
		if err != nil {
			return nil, err
		}
		quiz.Questions = string(questionsJSON)
	}
	if req.TimeLimit != nil {
		quiz.TimeLimit = req.TimeLimit
	}
	if req.AllowReview != nil {
		quiz.AllowReview = *req.AllowReview
	}
	if req.ShowResults != nil {
		quiz.ShowResults = *req.ShowResults
	}

	if err := s.repo.Update(ctx, quiz); err != nil {
		s.logger.Error().Err(err).Str("quiz_id", id.String()).Msg("Failed to update quiz")
		return nil, err
	}

	s.metrics.IncrementQuizUpdated()
	s.logger.Info().Str("quiz_id", id.String()).Msg("Quiz updated")

	return quiz, nil
}

func (s *QuizService) PublishQuiz(ctx context.Context, req *models.PublishQuizRequest, userID uuid.UUID) error {
	quiz, err := s.repo.GetByID(ctx, req.QuizID)
	if err != nil {
		return err
	}

	// Deactivate current active quiz in session
	if activeQuiz, err := s.repo.GetActiveBySessionID(ctx, quiz.SessionID); err == nil {
		s.repo.UpdateStatus(ctx, activeQuiz.ID, "completed")
	}

	now := time.Now()
	quiz.Status = "active"
	quiz.PublishedAt = &now

	if err := s.repo.Update(ctx, quiz); err != nil {
		s.logger.Error().Err(err).Str("quiz_id", req.QuizID.String()).Msg("Failed to publish quiz")
		return err
	}

	// Publish event to Redis
	channel := fmt.Sprintf("session:%s", quiz.SessionID.String())
	publishData := map[string]interface{}{
		"event": "quiz_published",
		"quiz_id": quiz.ID,
		"title": quiz.Title,
		"time_limit": quiz.TimeLimit,
		"allow_review": quiz.AllowReview,
		"show_results": quiz.ShowResults,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}

	data, _ := json.Marshal(publishData)
	s.redis.Publish(ctx, channel, data)

	// Publish to Kafka
	event := map[string]interface{}{
		"event_type": "classroom.quiz.started",
		"quiz_id": quiz.ID,
		"session_id": quiz.SessionID,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}
	s.kafkaProducer.Publish(ctx, "classroom.quiz.started", event)

	s.metrics.IncrementQuizPublished()
	s.logger.Info().Str("quiz_id", req.QuizID.String()).Str("session_id", quiz.SessionID.String()).Msg("Quiz published")

	return nil
}

func (s *QuizService) CompleteQuiz(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	quiz, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	now := time.Now()
	quiz.Status = "completed"
	quiz.CompletedAt = &now

	if err := s.repo.Update(ctx, quiz); err != nil {
		s.logger.Error().Err(err).Str("quiz_id", id.String()).Msg("Failed to complete quiz")
		return err
	}

	// Get results
	results, err := s.repo.GetResults(ctx, id)
	if err != nil {
		s.logger.Error().Err(err).Str("quiz_id", id.String()).Msg("Failed to get quiz results")
	}

	// Publish event to Redis
	channel := fmt.Sprintf("session:%s", quiz.SessionID.String())
	completeData := map[string]interface{}{
		"event": "quiz_completed",
		"quiz_id": quiz.ID,
		"results": results,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}

	data, _ := json.Marshal(completeData)
	s.redis.Publish(ctx, channel, data)

	// Publish to Kafka
	event := map[string]interface{}{
		"event_type": "classroom.quiz.finished",
		"quiz_id": quiz.ID,
		"session_id": quiz.SessionID,
		"results": results,
		"user_id": userID,
		"timestamp": time.Now().UTC(),
	}
	s.kafkaProducer.Publish(ctx, "classroom.quiz.finished", event)

	s.metrics.IncrementQuizCompleted()
	s.logger.Info().Str("quiz_id", id.String()).Msg("Quiz completed")

	return nil
}

func (s *QuizService) SubmitQuiz(ctx context.Context, req *models.SubmitQuizRequest, userID uuid.UUID) error {
	quiz, err := s.repo.GetByID(ctx, req.QuizID)
	if err != nil {
		return err
	}

	// Check if quiz is active
	if quiz.Status != "active" {
		return fmt.Errorf("quiz is not active")
	}

	// Check if user already submitted
	if _, err := s.repo.GetUserSubmission(ctx, req.QuizID, userID); err == nil {
		return fmt.Errorf("already submitted this quiz")
	}

	// Auto-grade the quiz
	score := s.gradeQuiz(quiz, req.Answers)

	answersJSON, err := json.Marshal(req.Answers)
	if err != nil {
		return err
	}

	now := time.Now()
	submission := &models.QuizSubmission{
		QuizID:      req.QuizID,
		UserID:      userID,
		Answers:     string(answersJSON),
		Score:       &score,
		TimeTaken:   &req.TimeTaken,
		SubmittedAt: now,
		GradedAt:    &now,
	}

	if err := s.repo.CreateSubmission(ctx, submission); err != nil {
		s.logger.Error().Err(err).Str("quiz_id", req.QuizID.String()).Msg("Failed to submit quiz")
		return err
	}

	// Publish submission event
	channel := fmt.Sprintf("quiz:%s", req.QuizID.String())
	submitData := map[string]interface{}{
		"event": "quiz_submitted",
		"user_id": userID,
		"score": score,
		"time_taken": req.TimeTaken,
		"timestamp": time.Now().UTC(),
	}

	data, _ := json.Marshal(submitData)
	s.redis.Publish(ctx, channel, data)

	s.metrics.IncrementQuizSubmissions()
	s.logger.Info().Str("quiz_id", req.QuizID.String()).Str("user_id", userID.String()).Float64("score", score).Msg("Quiz submitted")

	return nil
}

func (s *QuizService) gradeQuiz(quiz *models.Quiz, answers []models.Answer) float64 {
	var questions []models.Question
	if err := json.Unmarshal([]byte(quiz.Questions), &questions); err != nil {
		return 0
	}

	// Create answer map for quick lookup
	answerMap := make(map[string]interface{})
	for _, answer := range answers {
		answerMap[answer.QuestionID] = answer.Answer
	}

	totalPoints := 0
	earnedPoints := 0

	for _, question := range questions {
		totalPoints += question.Points

		userAnswer, exists := answerMap[question.ID]
		if !exists {
			continue
		}

		correct := s.checkAnswer(question, userAnswer)
		if correct {
			earnedPoints += question.Points
		}
	}

	if totalPoints == 0 {
		return 0
	}

	return (float64(earnedPoints) / float64(totalPoints)) * 100
}

func (s *QuizService) checkAnswer(question models.Question, userAnswer interface{}) bool {
	switch question.Type {
	case "multiple_choice":
		userAnswers, ok := userAnswer.([]interface{})
		if !ok {
			return false
		}
		
		correctAnswers, ok := question.CorrectAnswer.([]interface{})
		if !ok {
			return false
		}
		
		if len(userAnswers) != len(correctAnswers) {
			return false
		}
		
		// Check if all user answers are in correct answers
		for _, ua := range userAnswers {
			found := false
			for _, ca := range correctAnswers {
				if ua == ca {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		}
		return true
		
	case "true_false":
		userBool, ok := userAnswer.(bool)
		if !ok {
			return false
		}
		
		correctBool, ok := question.CorrectAnswer.(bool)
		if !ok {
			return false
		}
		
		return userBool == correctBool
		
	case "short_answer":
		userStr, ok := userAnswer.(string)
		if !ok {
			return false
		}
		
		correctStr, ok := question.CorrectAnswer.(string)
		if !ok {
			return false
		}
		
		// Case-insensitive comparison
		return userStr == correctStr
		
	case "code":
		// Code questions require manual grading or advanced analysis
		// For now, mark as incorrect
		return false
		
	default:
		return false
	}
}

func (s *QuizService) GetResults(ctx context.Context, id uuid.UUID) ([]*models.QuizResult, error) {
	return s.repo.GetResults(ctx, id)
}

func (s *QuizService) GetUserSubmission(ctx context.Context, quizID, userID uuid.UUID) (*models.QuizSubmission, error) {
	return s.repo.GetUserSubmission(ctx, quizID, userID)
}

func (s *QuizService) GetSubmissions(ctx context.Context, quizID uuid.UUID) ([]*models.QuizSubmission, error) {
	return s.repo.GetSubmissions(ctx, quizID)
}

func (s *QuizService) GetAverageScore(ctx context.Context, quizID uuid.UUID) (float64, error) {
	return s.repo.GetAverageScore(ctx, quizID)
}

func (s *QuizService) DeleteQuiz(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	quiz, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Only allow deletion of draft quizzes
	if quiz.Status != "draft" {
		return fmt.Errorf("can only delete quizzes in draft status")
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		s.logger.Error().Err(err).Str("quiz_id", id.String()).Msg("Failed to delete quiz")
		return err
	}

	s.metrics.IncrementQuizDeleted()
	s.logger.Info().Str("quiz_id", id.String()).Msg("Quiz deleted")

	return nil
}
