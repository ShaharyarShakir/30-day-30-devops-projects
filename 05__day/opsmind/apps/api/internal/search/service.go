package search

import (
	"context"

	"github.com/ShaharyarShakir/opsmind-api/internal/database"
)

type Service struct {
	Queries *database.Queries
}

type Result struct {
	ID         string `json:"id"`
	DocumentID string `json:"document_id"`
	Content    string `json:"content"`
}

func (s Service) Search(ctx context.Context, query string) ([]Result, error) {

	vec, err := EmbedQuery(query)

	if err != nil {
		return nil, err
	}

	rows, err := s.Queries.SearchChunks(ctx, database.SearchChunksParams{
		Embedding: vec,
		Limit:     10,
	})

	if err != nil {
		return nil, err
	}

	results := make([]Result, 0, len(rows))

	for _, r := range rows {
		results = append(results, Result{
			ID:         r.ID.String(),
			DocumentID: r.DocumentID.String(),
			Content:    r.Content,
		})
	}

	return results, nil
}
