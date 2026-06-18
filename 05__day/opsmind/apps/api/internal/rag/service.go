package rag

import (
	"context"
	"fmt"

	"github.com/pgvector/pgvector-go"

	"github.com/ShaharyarShakir/opsmind-api/internal/database"
	"github.com/ShaharyarShakir/opsmind-api/internal/llm"
	"github.com/ShaharyarShakir/opsmind-pkg/embedding"
)

type Service struct {
	Queries *database.Queries
}

func (s Service) Ask(ctx context.Context, question string) (string, error) {

	// 1. Generate embedding for query
	rawVec, err := embedding.Generate(question)
	if err != nil {
		return "", err
	}

	// convert to pgvector format
	vec := pgvector.NewVector(rawVec)

	// 2. Retrieve top relevant chunks from pgvector
	chunks, err := s.Queries.SearchChunks(ctx, database.SearchChunksParams{
		Embedding: vec,
		Limit:     5,
	})
	if err != nil {
		return "", err
	}

	if len(chunks) == 0 {
		return "No relevant context found.", nil
	}

	// 3. Build context string
	var contextText string
	for _, c := range chunks {
		contextText += c.Content + "\n\n"
	}

	// 4. Build prompt for LLM
	prompt := fmt.Sprintf(`
You are a DevOps assistant.

Use ONLY the context below:

%s

Question:
%s

Answer clearly, step-by-step, and be precise.
`, contextText, question)

	// 5. Call LLM (Ollama / DeepSeek)
	answer, err := llm.Generate(prompt)
	if err != nil {
		return "", err
	}

	return answer, nil
}
