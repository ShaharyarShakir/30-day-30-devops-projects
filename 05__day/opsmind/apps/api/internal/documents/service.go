package documents

import (
	"context"
	"io"

	"github.com/ShaharyarShakir/opsmind-api/internal/database"
	"github.com/ShaharyarShakir/opsmind-api/internal/storage"
	"github.com/jackc/pgx/v5/pgtype"
)

type Service struct {
	Queries *database.Queries
	Storage storage.LocalStorage
}

func (s Service) CreateDocument(
	ctx context.Context,
	title string,
	filename string,
	contentType string,
	reader io.Reader,
) error {

	path, err := s.Storage.Save(filename, reader)
	if err != nil {
		return err
	}

	content, err := ParseText(path)
	if err != nil {
		return err
	}

	document, err := s.Queries.CreateDocument(
		ctx,
		database.CreateDocumentParams{
			Title:    title,
			Filename: filename,
			ContentType: pgtype.Text{
				String: contentType,
				Valid:  true,
			},
		},
	)
	if err != nil {
		return err
	}

	chunks := Chunk(content, 200)

	for _, chunk := range chunks {
		_, err = s.Queries.CreateChunk(
			ctx,
			database.CreateChunkParams{
				DocumentID: document.ID, // FIX: use generated uuid.UUID directly
				Content:    chunk,
			},
		)
		if err != nil {
			return err
		}
	}

	return nil
}
