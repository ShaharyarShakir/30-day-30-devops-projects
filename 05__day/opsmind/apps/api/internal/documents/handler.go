package documents

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	Service Service
}

func NewHandler(service Service) Handler {

	return Handler{
		Service: service,
	}

}

func (h Handler) Upload(

	w http.ResponseWriter,

	r *http.Request,

) {

	file, header, err := r.FormFile("file")

	if err != nil {

		http.Error(
			w,
			err.Error(),
			400,
		)

		return

	}

	defer file.Close()

	w.Write([]byte(header.Filename))

}

func Routes(h Handler) chi.Router {

	r := chi.NewRouter()

	r.Post(
		"/upload",
		h.Upload,
	)

	return r

}
