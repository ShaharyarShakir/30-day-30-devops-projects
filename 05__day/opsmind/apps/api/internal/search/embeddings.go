package search

import (
	"github.com/ShaharyarShakir/opsmind-pkg/embedding"
	"github.com/pgvector/pgvector-go"
)

func EmbedQuery(text string) (pgvector.Vector, error) {

	vec, err := embedding.Generate(text)

	if err != nil {

		return pgvector.Vector{}, err

	}

	return pgvector.NewVector(vec), nil

}
