package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

var jwtSecret = []byte(getEnv("JWT_SECRET", "super-secret-dev-key"))

// --- Rate Limiter ---
type bucket struct {
	tokens   float64
	lastSeen time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	clients  map[string]*bucket
	rate     float64 // tokens per second
	capacity float64 // max capacity
}

func NewRateLimiter(rate, capacity float64) *RateLimiter {
	rl := &RateLimiter{
		clients:  make(map[string]*bucket),
		rate:     rate,
		capacity: capacity,
	}
	go rl.cleanupLoop()
	return rl
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, exists := rl.clients[ip]
	if !exists {
		rl.clients[ip] = &bucket{
			tokens:   rl.capacity - 1.0,
			lastSeen: now,
		}
		return true
	}

	elapsed := now.Sub(b.lastSeen).Seconds()
	b.tokens += elapsed * rl.rate
	if b.tokens > rl.capacity {
		b.tokens = rl.capacity
	}
	b.lastSeen = now

	if b.tokens >= 1.0 {
		b.tokens -= 1.0
		return true
	}
	return false
}

func (rl *RateLimiter) cleanupLoop() {
	for {
		time.Sleep(5 * time.Minute)
		rl.mu.Lock()
		now := time.Now()
		for ip, b := range rl.clients {
			if now.Sub(b.lastSeen) > 15*time.Minute {
				delete(rl.clients, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// --- Metrics ---
type Metrics struct {
	mu         sync.RWMutex
	reqCounter map[string]int64
	latencies  map[string]int64
}

var globalMetrics = &Metrics{
	reqCounter: make(map[string]int64),
	latencies:  make(map[string]int64),
}

func (m *Metrics) Record(method, path string, status int, durationMs int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	normPath := path
	if strings.HasPrefix(path, "/api/resumes/") && len(strings.TrimPrefix(path, "/api/resumes/")) > 0 {
		normPath = "/api/resumes/:id"
	}

	counterKey := fmt.Sprintf("%s|%s|%d", method, normPath, status)
	m.reqCounter[counterKey]++

	latencyKey := fmt.Sprintf("%s|%s", method, normPath)
	m.latencies[latencyKey] += durationMs
}

// Custom response writer to track status code for metrics
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

// --- Main Gateway ---
func main() {
	authTarget := getEnv("AUTH_SERVICE_URL", "http://auth-service:8081")
	resumeTarget := getEnv("RESUME_SERVICE_URL", "http://resume-service:8082")
	mlTarget := getEnv("ML_SERVICE_URL", "http://ml-service:8083")

	authProxy := createProxy(authTarget, func(path string) string {
		return strings.TrimPrefix(path, "/api/auth")
	})

	resumeProxy := createProxy(resumeTarget, func(path string) string {
		if path == "/api/resumes" || path == "/api/resumes/" {
			return "/upload"
		}
		if strings.HasPrefix(path, "/api/resumes/") {
			id := strings.TrimPrefix(path, "/api/resumes/")
			return "/resume/" + id
		}
		return path
	})

	mlProxy := createProxy(mlTarget, func(path string) string {
		if path == "/api/inference" || path == "/api/inference/" {
			return "/predict"
		}
		return path
	})

	// Rate limiter: 5 tokens/sec, capacity of 10
	limiter := NewRateLimiter(5.0, 10.0)

	mux := http.NewServeMux()

	// Local Routes
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("GET /metrics", handleMetrics)

	// Proxy Routes
	mux.HandleFunc("/api/auth/", func(w http.ResponseWriter, r *http.Request) {
		authProxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/resumes", func(w http.ResponseWriter, r *http.Request) {
		resumeProxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/resumes/", func(w http.ResponseWriter, r *http.Request) {
		resumeProxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/inference", func(w http.ResponseWriter, r *http.Request) {
		mlProxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/inference/", func(w http.ResponseWriter, r *http.Request) {
		mlProxy.ServeHTTP(w, r)
	})

	// Middleware wrapping
	handler := rateLimitMiddleware(limiter, mux)
	handler = authMiddleware(handler)
	handler = loggingAndMetricsMiddleware(handler)

	port := getEnv("PORT", "8080")
	log.Printf("API Gateway starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Gateway failed: %v", err)
	}
}

func createProxy(target string, pathRewriter func(string) string) *httputil.ReverseProxy {
	targetURL, err := url.Parse(target)
	if err != nil {
		log.Fatalf("Invalid target URL %s: %v", target, err)
	}
	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.URL.Path = pathRewriter(req.URL.Path)
		req.Host = targetURL.Host
	}
	return proxy
}

func getClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	if strings.Contains(ip, ":") {
		host, _, err := net.SplitHostPort(ip)
		if err == nil {
			return host
		}
	}
	return ip
}

// --- Middlewares ---
func rateLimitMiddleware(rl *RateLimiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Bypass health/metrics for rate limiting if desired, or rate limit them too
		ip := getClientIP(r)
		if !rl.Allow(ip) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error": "Too many requests. Please try again later."}`))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// Skip JWT validation for local endpoints, register and login
		if path == "/health" || path == "/metrics" || path == "/api/auth/login" || path == "/api/auth/register" {
			next.ServeHTTP(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error": "Unauthorized: Missing Authorization Bearer token"}`))
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		sub, email, err := validateJWT(tokenStr, jwtSecret)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(fmt.Sprintf(`{"error": "Unauthorized: %s"}`, err.Error())))
			return
		}

		// Inject headers for downstream services
		r.Header.Set("X-User-ID", sub)
		r.Header.Set("X-User-Email", email)

		next.ServeHTTP(w, r)
	})
}

func loggingAndMetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w}
		
		next.ServeHTTP(sw, r)
		
		durationMs := time.Since(start).Milliseconds()
		status := sw.status
		if status == 0 {
			status = http.StatusOK
		}

		log.Printf("%s %s %s | Status: %d | Duration: %dms", r.Method, r.URL.Path, r.RemoteAddr, status, durationMs)
		globalMetrics.Record(r.Method, r.URL.Path, status, durationMs)
	})
}

// --- JWT Decoder & Validator ---
func validateJWT(tokenStr string, secret []byte) (userID string, email string, err error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return "", "", errors.New("invalid token format")
	}

	// Verify HMAC-SHA256 signature
	signingInput := parts[0] + "." + parts[1]
	sigBytes, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return "", "", errors.New("failed to decode signature")
	}

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(signingInput))
	expectedSig := mac.Sum(nil)

	if !hmac.Equal(sigBytes, expectedSig) {
		return "", "", errors.New("invalid signature")
	}

	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", "", errors.New("failed to decode payload")
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return "", "", errors.New("failed to parse claims JSON")
	}

	// Validate expiration
	expVal, ok := claims["exp"]
	if !ok {
		return "", "", errors.New("missing exp claim")
	}
	var exp int64
	switch v := expVal.(type) {
	case float64:
		exp = int64(v)
	case string:
		exp, err = strconv.ParseInt(v, 10, 64)
		if err != nil {
			return "", "", errors.New("invalid exp claim format")
		}
	default:
		return "", "", errors.New("invalid exp claim type")
	}

	if time.Now().Unix() > exp {
		return "", "", errors.New("token has expired")
	}

	// Extract sub and email
	subVal, ok := claims["sub"]
	if !ok {
		return "", "", errors.New("missing sub claim")
	}
	var sub string
	switch v := subVal.(type) {
	case string:
		sub = v
	case float64:
		sub = strconv.Itoa(int(v))
	default:
		return "", "", errors.New("invalid sub claim type")
	}

	emailStr := ""
	if emailVal, exists := claims["email"]; exists {
		if val, ok := emailVal.(string); ok {
			emailStr = val
		}
	}

	return sub, emailStr, nil
}

// --- Handler Functions ---
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "healthy"}`))
}

func handleMetrics(w http.ResponseWriter, r *http.Request) {
	globalMetrics.mu.RLock()
	defer globalMetrics.mu.RUnlock()

	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")

	// Total Requests Counter
	w.Write([]byte("# HELP http_requests_total Total number of HTTP requests\n"))
	w.Write([]byte("# TYPE http_requests_total counter\n"))
	for key, val := range globalMetrics.reqCounter {
		parts := strings.Split(key, "|")
		method := parts[0]
		path := parts[1]
		status := parts[2]
		fmt.Fprintf(w, "http_requests_total{method=\"%s\",path=\"%s\",status=\"%s\"} %d\n", method, path, status, val)
	}

	// Latency Counter
	w.Write([]byte("# HELP http_request_duration_ms_total Total HTTP request latency in milliseconds\n"))
	w.Write([]byte("# TYPE http_request_duration_ms_total counter\n"))
	for key, val := range globalMetrics.latencies {
		parts := strings.Split(key, "|")
		method := parts[0]
		path := parts[1]
		fmt.Fprintf(w, "http_request_duration_ms_total{method=\"%s\",path=\"%s\"} %d\n", method, path, val)
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
