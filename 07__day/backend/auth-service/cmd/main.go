package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"auth-service/internal"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte(getEnv("JWT_SECRET", "super-secret-dev-key"))

type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func main() {
	internal.InitDB()
	defer internal.DB.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("POST /register", handleRegister)
	mux.HandleFunc("POST /login", handleLogin)
	mux.HandleFunc("GET /profile", handleProfile)
	mux.HandleFunc("GET /health", handleHealth)

	port := getEnv("PORT", "8081")
	log.Printf("Authentication service starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, loggerMiddleware(mux)); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func loggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s %s", r.Method, r.RequestURI, r.RemoteAddr, time.Since(start))
	})
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// Validate role
	req.Role = strings.TrimSpace(strings.ToLower(req.Role))
	if req.Role == "" {
		req.Role = "candidate"
	}
	if req.Role != "candidate" && req.Role != "recruiter" && req.Role != "admin" {
		respondWithError(w, http.StatusBadRequest, "Invalid role. Allowed roles are: candidate, recruiter, admin")
		return
	}

	// Check if user already exists
	var exists bool
	err := internal.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		log.Printf("Database check error: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	if exists {
		respondWithError(w, http.StatusConflict, "User with this email already exists")
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Password hashing error: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	// Save to DB
	var user User
	err = internal.DB.QueryRow(
		"INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at",
		req.Email, string(hashedPassword), req.Role,
	).Scan(&user.ID, &user.Email, &user.Role, &user.CreatedAt)

	if err != nil {
		log.Printf("Database insert error: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to save user")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// Find user
	var user User
	err := internal.DB.QueryRow(
		"SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		} else {
			log.Printf("Database error during login: %v", err)
			respondWithError(w, http.StatusInternalServerError, "Database error")
		}
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   strconv.Itoa(user.ID),
		"email": user.Email,
		"role":  user.Role,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		log.Printf("JWT signing error: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{Token: tokenString})
}

func handleProfile(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		// Try to parse from Authorization header if gateway forwarded it directly
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
				return jwtSecret, nil
			})
			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					if sub, ok := claims["sub"].(string); ok {
						userIDStr = sub
					}
				}
			}
		}
	}

	if userIDStr == "" {
		respondWithError(w, http.StatusUnauthorized, "Unauthorized: User ID not provided")
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid User ID format")
		return
	}

	var user User
	err = internal.DB.QueryRow(
		"SELECT id, email, role, created_at FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Email, &user.Role, &user.CreatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondWithError(w, http.StatusNotFound, "User not found")
		} else {
			log.Printf("Database error during profile fetch: %v", err)
			respondWithError(w, http.StatusInternalServerError, "Database error")
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	err := internal.DB.Ping()
	if err != nil {
		respondWithError(w, http.StatusServiceUnavailable, "Database unreachable")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "healthy"}`))
}

func respondWithError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
