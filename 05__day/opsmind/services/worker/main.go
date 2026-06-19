package main

import (
	"log"
	"time"

	"github.com/ShaharyarShakir/opsmind-pkg/embedding"
	"github.com/pgvector/pgvector-go"
)

func main() {

	db := connectDB()

	log.Println("embedding worker started")

	for {

		chunks, err := fetchChunks(db)

		if err != nil {

			log.Println("fetch error:", err)

			time.Sleep(3 * time.Second)

			continue
		}

		if len(chunks) == 0 {

			time.Sleep(3 * time.Second)

			continue
		}

		for _, c := range chunks {

			vec, err := embedding.Generate(c.Content)

			if err != nil {

				log.Println(
					"embedding error:",
					err,
				)

				continue
			}

			err = updateEmbedding(
				db,
				c.ID,
				pgvector.NewVector(vec),
			)

			if err != nil {

				log.Println(
					"update error:",
					err,
				)

			} else {

				log.Println(
					"embedded chunk:",
					c.ID,
				)

			}

		}

		time.Sleep(3 * time.Second)

	}

}
