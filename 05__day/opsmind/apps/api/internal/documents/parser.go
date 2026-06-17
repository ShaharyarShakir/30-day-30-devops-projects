package documents

import (
	"os"
	"strings"
)

func ParseText(path string) (string, error) {

	data, err := os.ReadFile(path)

	if err != nil {

		return "", err

	}

	return string(data), nil

}

func Clean(text string) string {

	return strings.TrimSpace(text)

}
