package storage

import (
	"io"
	"os"
	"path/filepath"
)

type LocalStorage struct {
	BasePath string
}

func New(base string) LocalStorage {

	return LocalStorage{
		BasePath: base,
	}

}

func (s LocalStorage) Save(
	filename string,
	reader io.Reader,
) (string, error) {

	err := os.MkdirAll(
		s.BasePath,
		0755,
	)

	if err != nil {
		return "", err
	}

	path := filepath.Join(
		s.BasePath,
		filename,
	)

	file, err := os.Create(path)

	if err != nil {
		return "", err
	}

	defer file.Close()

	_, err = io.Copy(file, reader)

	return path, err

}
