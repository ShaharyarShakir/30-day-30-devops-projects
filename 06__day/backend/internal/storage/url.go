package storage

import (
	"context"

	"go.opentelemetry.io/otel"
)

func (p *Postgres) CreateURL(
	ctx context.Context,
	originalURL string,
	shortCode string,
) error {
	ctx, span := otel.Tracer("url-shortener").Start(ctx, "postgres.insert_url")
	defer span.End()

	query := `
	INSERT INTO urls (
		original_url,
		short_code
	)
	VALUES ($1, $2)
	`

	_, err := p.DB.ExecContext(
		ctx,
		query,
		originalURL,
		shortCode,
	)

	if err != nil {
		span.RecordError(err)
	}

	return err
}

func (p *Postgres) GetURL(
	ctx context.Context,
	shortCode string,
) (string, error) {
	ctx, span := otel.Tracer("url-shortener").Start(ctx, "postgres.get_url")
	defer span.End()

	query := `
	SELECT original_url
	FROM urls
	WHERE short_code = $1
	`

	var url string

	err := p.DB.QueryRowContext(
		ctx,
		query,
		shortCode,
	).Scan(&url)

	if err != nil {
		span.RecordError(err)
	}

	return url, err
}
