package storage

import "context"

func (p *Postgres) CreateURL(
	ctx context.Context,
	originalURL string,
	shortCode string,
) error {
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

	return err
}

func (p *Postgres) GetURL(
	ctx context.Context,
	shortCode string,
) (string, error) {
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

	return url, err
}
