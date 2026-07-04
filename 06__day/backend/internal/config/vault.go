package config

import (
	"bufio"
	"log"
	"os"
	"strings"
)

var vaultConfigPath = "/vault/secrets/config"

// LoadVaultSecrets reads the Vault secrets injected at vaultConfigPath and loads them into environment variables.
// If the file does not exist, it logs a warning and returns nil to allow local/alternative configuration.
func LoadVaultSecrets() error {
	if _, err := os.Stat(vaultConfigPath); os.IsNotExist(err) {
		log.Printf("Vault config file not found at %s - skipping dynamic secret loading", vaultConfigPath)
		return nil
	}

	file, err := os.Open(vaultConfigPath)
	if err != nil {
		return err
	}
	defer func() { _ = file.Close() }()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		// If values are quoted, unquote them
		if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'')) {
			val = val[1 : len(val)-1]
		}

		if err := os.Setenv(key, val); err != nil {
			return err
		}
	}

	if err := scanner.Err(); err != nil {
		return err
	}

	log.Printf("Successfully loaded environment variables from Vault secrets file: %s", vaultConfigPath)
	return nil
}
