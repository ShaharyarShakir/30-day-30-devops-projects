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

	err = h.Service.CreateDocument(

		r.Context(),

		header.Filename,

		header.Filename,

		header.Header.Get("Content-Type"),

		file,
	)

	if err != nil {

		http.Error(
			w,
			err.Error(),
			500,
		)

		return

	}

	w.Write([]byte(
		"document processed",
	))

}