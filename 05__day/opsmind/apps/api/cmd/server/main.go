package main

import (
	"context"
	"log"
	"net/http"

	"github.com/ShaharyarShakir/opsmind-api/internal/database"
	"github.com/ShaharyarShakir/opsmind-api/internal/documents"
	"github.com/ShaharyarShakir/opsmind-api/internal/rag"
	"github.com/ShaharyarShakir/opsmind-api/internal/search"
	"github.com/ShaharyarShakir/opsmind-api/internal/storage"

	"github.com/go-chi/chi/v5"
)

func main() {

	db, err := database.Connect()

	if err != nil {
		log.Fatal(err)
	}

	defer db.Close(context.Background())

	queries := database.New(db)

	// storage service
	fileStorage := storage.New("./uploads")

	docService := documents.Service{

		Queries: queries,

		Storage: fileStorage,
	}

	docHandler := documents.NewHandler(docService)
	searchService := search.Service{
		Queries: queries,
	}

	searchHandler := search.NewHandler(searchService)
	ragService := rag.Service{
		Queries: queries,
	}

	ragHandler := rag.NewHandler(ragService)

	r := chi.NewRouter()

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {

		w.Write([]byte("OpsMind API running"))

	})

	r.Mount(
		"/documents",
		documents.Routes(docHandler),
	)
	r.Mount("/search", search.Routes(searchHandler))
	log.Println("server running on :8080")
	r.Mount("/ask", rag.Routes(ragHandler))
	log.Fatal(
		http.ListenAndServe(":8080", r),
	)

}
