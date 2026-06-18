package llm

import (
	"bytes"
	"encoding/json"
	"net/http"
)

type Request struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

type Response struct {
	Response string `json:"response"`
}

func Generate(prompt string) (string, error) {

	body := Request{
		Model:  "deepseek-coder:1.3b",
		Prompt: prompt,
		Stream: false,
	}

	b, _ := json.Marshal(body)

	resp, err := http.Post(
		"http://localhost:11434/api/generate",
		"application/json",
		bytes.NewBuffer(b),
	)

	if err != nil {
		return "", err
	}

	defer resp.Body.Close()

	var result Response

	json.NewDecoder(resp.Body).Decode(&result)

	return result.Response, nil
}
