package session

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/livekit/protocol/auth"
	"github.com/livekit/server-sdk-go"
	"github.com/platform/services/live-session/internal/database"
	"github.com/platform/services/live-session/internal/event"
	"github.com/platform/services/live-session/internal/presence"
)

var (
	ErrUnauthorized       = errors.New("unauthorized operation")
	ErrSessionNotFound    = errors.New("live session not found")
	ErrInvalidTransition  = errors.New("invalid status transition")
	ErrSessionEnded       = errors.New("session has already ended")
	ErrNotEnrolled        = errors.New("user is not enrolled in the course associated with this session")
	ErrParticipantNotFound = errors.New("participant details not found for this session")
)

type Service struct {
	repo              Repository
	presenceManager   *presence.Manager
	jwtSecret         string
	courseServiceURL  string
	livekitURL        string
	livekitAPIKey     string
	livekitAPISecret  string
	livekitClient     *livekit.RoomServiceClient
	httpClient        *http.Client
}

func NewService(repo Repository, presenceManager *presence.Manager, jwtSecret string, courseServiceURL string, livekitURL string, livekitAPIKey string, livekitAPISecret string, livekitClient *livekit.RoomServiceClient) *Service {
	return &Service{
		repo:             repo,
		presenceManager:  presenceManager,
		jwtSecret:        jwtSecret,
		courseServiceURL: courseServiceURL,
		livekitURL:       livekitURL,
		livekitAPIKey:    livekitAPIKey,
		livekitAPISecret: livekitAPISecret,
		livekitClient:    livekitClient,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (s *Service) CreateSession(ctx context.Context, req CreateSessionRequest, instructorID uuid.UUID) (*LiveSession, error) {
	courseUUID, err := uuid.Parse(req.CourseID)
	if err != nil {
		return nil, fmt.Errorf("invalid course ID: %w", err)
	}

	sessionID := uuid.New()
	status := "SCHEDULED"
	// If scheduled for the past or now, set to waiting
	if req.ScheduledAt != nil && req.ScheduledAt.Before(time.Now().Add(1*time.Minute)) {
		status = "WAITING"
	}

	ls := &LiveSession{
		ID:           sessionID,
		CourseID:     courseUUID,
		InstructorID: instructorID,
		Title:        req.Title,
		Description:  req.Description,
		ScheduledAt:  req.ScheduledAt,
		Status:       status,
		CreatedAt:    time.Now(),
	}

	var created *LiveSession
	err = s.repo.WithTx(ctx, func(qtx *database.Queries) error {
		dbSession, err := qtx.CreateLiveSession(ctx, database.CreateLiveSessionParams{
			ID:           database.UUIDToPg(ls.ID),
			CourseID:     database.UUIDToPg(ls.CourseID),
			InstructorID: database.UUIDToPg(ls.InstructorID),
			Title:        ls.Title,
			Description:  database.StringPtrToPg(ls.Description),
			ScheduledAt:  database.TimePtrToPg(ls.ScheduledAt),
			Status:       ls.Status,
			CreatedAt:    database.TimeToPg(ls.CreatedAt),
		})
		if err != nil {
			return err
		}
		created = &LiveSession{
			ID:           database.PgToUUID(dbSession.ID),
			CourseID:     database.PgToUUID(dbSession.CourseID),
			InstructorID: database.PgToUUID(dbSession.InstructorID),
			Title:        dbSession.Title,
			Description:  database.PgToStringPtr(dbSession.Description),
			ScheduledAt:  database.PgToTimePtr(dbSession.ScheduledAt),
			Status:       dbSession.Status,
			CreatedAt:    database.PgToTime(dbSession.CreatedAt),
		}

		// Queue live.session.created event
		return event.QueueOutboxEvent(ctx, qtx, created.ID, "live_session", "live.session.created", map[string]interface{}{
			"id":            created.ID,
			"course_id":     created.CourseID,
			"instructor_id": created.InstructorID,
			"title":         created.Title,
			"scheduled_at":  created.ScheduledAt,
			"status":        created.Status,
			"created_at":    created.CreatedAt,
		})
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create session transactionally: %w", err)
	}

	return created, nil
}

func (s *Service) GetSession(ctx context.Context, id uuid.UUID) (*LiveSession, error) {
	ls, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ls == nil {
		return nil, ErrSessionNotFound
	}
	return ls, nil
}

func (s *Service) ListSessions(ctx context.Context, courseID uuid.UUID) ([]*LiveSession, error) {
	return s.repo.ListByCourse(ctx, courseID)
}

func (s *Service) UpdateSession(ctx context.Context, id uuid.UUID, req UpdateSessionRequest, instructorID uuid.UUID, isAdmin bool) (*LiveSession, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrSessionNotFound
	}

	if existing.InstructorID != instructorID && !isAdmin {
		return nil, ErrUnauthorized
	}

	return s.repo.UpdateDetails(ctx, id, req.Title, req.Description, req.ScheduledAt)
}

func (s *Service) DeleteSession(ctx context.Context, id uuid.UUID, instructorID uuid.UUID, isAdmin bool) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrSessionNotFound
	}

	if existing.InstructorID != instructorID && !isAdmin {
		return ErrUnauthorized
	}

	return s.repo.Delete(ctx, id)
}

func (s *Service) StartSession(ctx context.Context, id uuid.UUID, instructorID uuid.UUID, isAdmin bool) (*LiveSession, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrSessionNotFound
	}

	if existing.InstructorID != instructorID && !isAdmin {
		return nil, ErrUnauthorized
	}

	if existing.Status != "SCHEDULED" && existing.Status != "WAITING" {
		return nil, ErrInvalidTransition
	}

	now := time.Now()
	var updated *LiveSession
	err = s.repo.WithTx(ctx, func(qtx *database.Queries) error {
		dbSession, err := qtx.UpdateLiveSessionStatus(ctx, database.UpdateLiveSessionStatusParams{
			ID:        database.UUIDToPg(id),
			Status:    "LIVE",
			StartedAt: database.TimeToPg(now),
		})
		if err != nil {
			return err
		}

		updated = &LiveSession{
			ID:           database.PgToUUID(dbSession.ID),
			CourseID:     database.PgToUUID(dbSession.CourseID),
			InstructorID: database.PgToUUID(dbSession.InstructorID),
			Title:        dbSession.Title,
			Description:  database.PgToStringPtr(dbSession.Description),
			ScheduledAt:  database.PgToTimePtr(dbSession.ScheduledAt),
			StartedAt:    database.PgToTimePtr(dbSession.StartedAt),
			EndedAt:      database.PgToTimePtr(dbSession.EndedAt),
			Status:       dbSession.Status,
			CreatedAt:    database.PgToTime(dbSession.CreatedAt),
		}

		// Queue live.session.started event
		return event.QueueOutboxEvent(ctx, qtx, updated.ID, "live_session", "live.session.started", map[string]interface{}{
			"id":         updated.ID,
			"started_at": updated.StartedAt,
			"status":     updated.Status,
		})
	})

	if err != nil {
		return nil, fmt.Errorf("failed to start session: %w", err)
	}

	return updated, nil
}

func (s *Service) EndSession(ctx context.Context, id uuid.UUID, instructorID uuid.UUID, isAdmin bool) (*LiveSession, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrSessionNotFound
	}

	if existing.InstructorID != instructorID && !isAdmin {
		return nil, ErrUnauthorized
	}

	if existing.Status != "LIVE" {
		return nil, ErrInvalidTransition
	}

	now := time.Now()
	var updated *LiveSession
	err = s.repo.WithTx(ctx, func(qtx *database.Queries) error {
		dbSession, err := qtx.UpdateLiveSessionStatus(ctx, database.UpdateLiveSessionStatusParams{
			ID:      database.UUIDToPg(id),
			Status:  "ENDED",
			EndedAt: database.TimeToPg(now),
		})
		if err != nil {
			return err
		}

		updated = &LiveSession{
			ID:           database.PgToUUID(dbSession.ID),
			CourseID:     database.PgToUUID(dbSession.CourseID),
			InstructorID: database.PgToUUID(dbSession.InstructorID),
			Title:        dbSession.Title,
			Description:  database.PgToStringPtr(dbSession.Description),
			ScheduledAt:  database.PgToTimePtr(dbSession.ScheduledAt),
			StartedAt:    database.PgToTimePtr(dbSession.StartedAt),
			EndedAt:      database.PgToTimePtr(dbSession.EndedAt),
			Status:       dbSession.Status,
			CreatedAt:    database.PgToTime(dbSession.CreatedAt),
		}

		// Queue live.session.ended event
		return event.QueueOutboxEvent(ctx, qtx, updated.ID, "live_session", "live.session.ended", map[string]interface{}{
			"id":       updated.ID,
			"ended_at": updated.EndedAt,
			"status":   updated.Status,
		})
	})

	if err != nil {
		return nil, fmt.Errorf("failed to end session: %w", err)
	}

	return updated, nil
}

func (s *Service) JoinSession(ctx context.Context, id uuid.UUID, userID uuid.UUID, userRoles []string, userEmail string) (*SessionTokenResponse, error) {
	ls, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ls == nil {
		return nil, ErrSessionNotFound
	}

	if ls.Status == "ENDED" || ls.Status == "CANCELLED" {
		return nil, ErrSessionEnded
	}

	// Permission check
	role := "STUDENT"
	isInstructor := false
	for _, r := range userRoles {
		if r == "instructor" && ls.InstructorID == userID {
			isInstructor = true
			role = "INSTRUCTOR"
		}
		if r == "admin" {
			isInstructor = true
			role = "INSTRUCTOR"
		}
	}

	// If student, check enrollment in course
	if !isInstructor {
		enrolled, err := s.verifyEnrollment(ctx, ls.CourseID, userID)
		if err != nil {
			return nil, fmt.Errorf("enrollment verification failed: %w", err)
		}
		if !enrolled {
			return nil, ErrNotEnrolled
		}
	}

	now := time.Now()
	pID := uuid.New()

	err = s.repo.WithTx(ctx, func(qtx *database.Queries) error {
		_, err := qtx.CreateParticipant(ctx, database.CreateParticipantParams{
			ID:        database.UUIDToPg(pID),
			SessionID: database.UUIDToPg(id),
			UserID:    database.UUIDToPg(userID),
			Role:      role,
			JoinedAt:  database.TimeToPg(now),
		})
		if err != nil {
			return err
		}

		// Queue live.participant.joined event
		return event.QueueOutboxEvent(ctx, qtx, pID, "participant", "live.participant.joined", map[string]interface{}{
			"id":         pID,
			"session_id": id,
			"user_id":    userID,
			"role":       role,
			"joined_at":  now,
		})
	})
	if err != nil {
		return nil, fmt.Errorf("failed to register participant: %w", err)
	}

	// Update presence in Redis
	err = s.presenceManager.AddUser(ctx, id.String(), userID.String())
	if err != nil {
		// Log it, but do not block joining since DB is committed
		fmt.Printf("failed to update Redis presence: %v\n", err)
	}

	// Generate authorization token
	tokenClaims := jwt.MapClaims{
		"sub":        userID.String(),
		"session_id": id.String(),
		"role":       role,
		"exp":        time.Now().Add(2 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, tokenClaims)
	signedToken, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign session token: %w", err)
	}

	// Generate LiveKit token
	roomName := id.String()
	lkToken, err := s.generateLiveKitToken(roomName, userID.String(), userEmail, isInstructor)
	if err != nil {
		return nil, fmt.Errorf("failed to generate LiveKit token: %w", err)
	}

	return &SessionTokenResponse{
		Token:        signedToken,
		LiveKitToken: lkToken,
		LiveKitURL:   s.livekitURL,
		SessionID:    id.String(),
		UserID:       userID.String(),
		Role:         role,
		Status:       ls.Status,
	}, nil
}

func (s *Service) generateLiveKitToken(roomName string, userID string, userEmail string, isInstructor bool) (string, error) {
	at := auth.NewAccessToken(s.livekitAPIKey, s.livekitAPISecret)
	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     roomName,
	}

	if isInstructor {
		grant.RoomCreate = true
		grant.CanPublish = true
		grant.CanPublishData = true
		grant.CanSubscribe = true
	} else {
		grant.CanSubscribe = true
		grant.CanPublish = false
		grant.CanPublishData = true
	}

	at.AddGrant(grant)
	at.SetIdentity(userID)
	at.SetName(userEmail)
	at.SetValidFor(2 * time.Hour)

	return at.ToJWT()
}

func (s *Service) LeaveSession(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	p, err := s.repo.GetParticipant(ctx, id, userID)
	if err != nil {
		return err
	}
	if p == nil {
		return ErrParticipantNotFound
	}

	if p.LeftAt != nil {
		return nil // already left
	}

	now := time.Now()
	duration := int(now.Sub(*p.JoinedAt).Seconds())
	if duration < 0 {
		duration = 0
	}

	err = s.repo.WithTx(ctx, func(qtx *database.Queries) error {
		// Update participant left_at
		_, err := qtx.UpdateParticipantLeft(ctx, database.UpdateParticipantLeftParams{
			SessionID: database.UUIDToPg(id),
			UserID:    database.UUIDToPg(userID),
			LeftAt:    database.TimeToPg(now),
		})
		if err != nil {
			return err
		}

		// Upsert attendance duration
		attID := uuid.New()
		_, err = qtx.UpsertAttendance(ctx, database.UpsertAttendanceParams{
			ID:        database.UUIDToPg(attID),
			SessionID: database.UUIDToPg(id),
			UserID:    database.UUIDToPg(userID),
			Duration:  int32(duration),
		})
		if err != nil {
			return err
		}

		// Queue live.participant.left event
		return event.QueueOutboxEvent(ctx, qtx, p.ID, "participant", "live.participant.left", map[string]interface{}{
			"id":         p.ID,
			"session_id": id,
			"user_id":    userID,
			"left_at":    now,
			"duration":   duration,
		})
	})
	if err != nil {
		return fmt.Errorf("failed to record leave operation transactionally: %w", err)
	}

	// Remove presence in Redis
	err = s.presenceManager.RemoveUser(ctx, id.String(), userID.String())
	if err != nil {
		fmt.Printf("failed to remove Redis presence: %v\n", err)
	}

	return nil
}

func (s *Service) GetOnlineUsers(ctx context.Context, id uuid.UUID) ([]string, error) {
	return s.presenceManager.GetOnlineUsers(ctx, id.String())
}

func (s *Service) verifyEnrollment(ctx context.Context, courseID uuid.UUID, userID uuid.UUID) (bool, error) {
	url := fmt.Sprintf("%s/courses/%s/enrollments/%s", s.courseServiceURL, courseID, userID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("X-User-Id", userID.String())
	req.Header.Set("X-User-Roles", "student")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("course-service request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("course-service returned status: %d", resp.StatusCode)
	}

	var result struct {
		Enrolled bool `json:"enrolled"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}
	return result.Enrolled, nil
}
