package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadVaultSecrets(t *testing.T) {
	// Backup original config path
	origPath := vaultConfigPath
	defer func() {
		vaultConfigPath = origPath
	}()

	t.Run("FileDoesNotExist", func(t *testing.T) {
		vaultConfigPath = "/nonexistent/path/to/vault/secrets/config"
		err := LoadVaultSecrets()
		if err != nil {
			t.Fatalf("expected no error when file is missing, got: %v", err)
		}
	})

	t.Run("LoadSecretsSuccessfully", func(t *testing.T) {
		tempDir := t.TempDir()
		tempFile := filepath.Join(tempDir, "vault-config")

		content := `
# DB configurations
DB_USER = test_user
DB_PASSWORD = "test_password"
DB_NAME = 'test_db'

# malformed line (should be skipped)
INVALID_LINE
`
		err := os.WriteFile(tempFile, []byte(content), 0644)
		if err != nil {
			t.Fatalf("failed to create temp file: %v", err)
		}

		vaultConfigPath = tempFile
		err = LoadVaultSecrets()
		if err != nil {
			t.Fatalf("expected no error, got: %v", err)
		}

		// Verify environment variables are set correctly
		if user := os.Getenv("DB_USER"); user != "test_user" {
			t.Errorf("expected DB_USER 'test_user', got %q", user)
		}

		if pass := os.Getenv("DB_PASSWORD"); pass != "test_password" {
			t.Errorf("expected DB_PASSWORD 'test_password', got %q", pass)
		}

		if name := os.Getenv("DB_NAME"); name != "test_db" {
			t.Errorf("expected DB_NAME 'test_db', got %q", name)
		}

		// Clean up env vars
		os.Unsetenv("DB_USER")
		os.Unsetenv("DB_PASSWORD")
		os.Unsetenv("DB_NAME")
	})
}
