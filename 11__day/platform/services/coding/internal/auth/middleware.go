package auth

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const (
	UserIDKey contextKey = "user_id"
	RolesKey  contextKey = "roles"
)

// AuthMiddleware extracts gateway headers X-User-Id and X-User-Roles.
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-Id")
		rolesStr := r.Header.Get("X-User-Roles")

		// If headers are missing, we return 401 Unauthorized
		if userID == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"message":"Unauthorized: missing X-User-Id header"}`))
			return
		}

		var roles []string
		if rolesStr != "" {
			parts := strings.Split(rolesStr, ",")
			for _, p := range parts {
				trimmed := strings.TrimSpace(p)
				if trimmed != "" {
					roles = append(roles, trimmed)
				}
			}
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, RolesKey, roles)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserID retrieves the authenticated User ID from context.
func GetUserID(ctx context.Context) string {
	userID, _ := ctx.Value(UserIDKey).(string)
	return userID
}

// GetRoles retrieves the user roles from context.
func GetRoles(ctx context.Context) []string {
	roles, _ := ctx.Value(RolesKey).([]string)
	return roles
}

// HasRole checks if the user has a specific role.
func HasRole(ctx context.Context, role string) bool {
	roles := GetRoles(ctx)
	for _, r := range roles {
		if strings.EqualFold(r, role) {
			return true
		}
	}
	return false
}

// IsInstructorOrAdmin checks if the user is an instructor or admin.
func IsInstructorOrAdmin(ctx context.Context) bool {
	return HasRole(ctx, "instructor") || HasRole(ctx, "admin")
}
