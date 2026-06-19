package main

import (
	"bytes"
	"encoding/json"
	"net/http"
)

type EmbeddingRequest struct {
	Model string `json:"model"`
	Input string `json:"input"`
}

type EmbeddingResponse struct {
	Embedding []float32 `json:"embedding"`
}

func embed(text string) ([]float32, error) {

	payload := EmbeddingRequest{

		Model: "nomic-embed-text",

		Input: text,
	}

	body, _ := json.Marshal(payload)

	resp, err := http.Post(
		"http://localhost:11434/api/embeddings",
		"application/json",
		bytes.NewBuffer(body),
	)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	var result EmbeddingResponse

	err = json.NewDecoder(resp.Body).Decode(&result)

	return result.Embedding, err

}
