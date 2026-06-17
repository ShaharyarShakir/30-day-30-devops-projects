package main

import (
	"context"
	"log"
	"net/http"

	"github.com/ShaharyarShakir/opsmind-api/internal/database"
	"github.com/ShaharyarShakir/opsmind-api/internal/documents"
	"github.com/go-chi/chi/v5"
)

func main() {
	db, _ := database.Connect()
	queries := database.New(db)
	defer db.Close(context.Background())

	r := chi.NewRouter()
	docService := documents.Service{

		Queries: queries,
	}
	docHandler := documents.NewHandler(docService)

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OpsMind API running"))
	})
	r.Mount(
		"/documents",
		documents.Routes(docHandler),
	)
	log.Println("server running on :8080")

	log.Fatal(http.ListenAndServe(":8080", r))
}
