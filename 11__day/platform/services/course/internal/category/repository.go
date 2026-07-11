package category

import (
	"context"

	"github.com/platform/services/course/internal/database"
)

type Repository interface {
	List(ctx context.Context) ([]Category, error)
}

type PostgresRepository struct {
	queries *database.Queries
}

func NewPostgresRepository(queries *database.Queries) *PostgresRepository {
	return &PostgresRepository{queries: queries}
}

func (r *PostgresRepository) List(ctx context.Context) ([]Category, error) {
	dbCats, err := r.queries.ListCategories(ctx)
	if err != nil {
		return nil, err
	}

	cats := make([]Category, len(dbCats))
	for i, c := range dbCats {
		cats[i] = Category{
			ID:   database.PgToUUID(c.ID),
			Name: c.Name,
		}
	}
	return cats, nil
}
