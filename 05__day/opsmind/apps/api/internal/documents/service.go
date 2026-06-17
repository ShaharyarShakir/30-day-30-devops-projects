package documents

import (
	"context"

	"github.com/ShaharyarShakir/opsmind-api/internal/database"
	"github.com/google/uuid"
)

type Service struct {
	Queries *database.Queries
}

func (s Service) SaveChunks(

	ctx context.Context,

	documentID uuid.UUID,

	chunks []string,

) error {

	for _, chunk := range chunks {

		_, err := s.Queries.CreateChunk(

			ctx,

			database.CreateChunkParams{

				DocumentID: documentID,

				Content: chunk,
			},
		)

		if err != nil {

			return err

		}

	}

	return nil

}
