package embedding

import (
	"bytes"
	"encoding/json"
	"net/http"
)

type Request struct {
	Model string `json:"model"`

	Prompt string `json:"prompt"`
}

type Response struct {
	Embedding []float32 `json:"embedding"`
}

func Generate(text string) ([]float32, error) {

	payload := Request{

		Model: "nomic-embed-text",

		Prompt: text,
	}

	body, err := json.Marshal(payload)

	if err != nil {
		return nil, err
	}

	resp, err := http.Post(

		"http://localhost:11434/api/embeddings",

		"application/json",

		bytes.NewBuffer(body),
	)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	var result Response

	err = json.NewDecoder(resp.Body).Decode(&result)

	return result.Embedding, err

}
