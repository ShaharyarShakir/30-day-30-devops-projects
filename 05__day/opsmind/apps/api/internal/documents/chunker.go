package documents

import "strings"

func Chunk(
	text string,
	size int,
) []string {

	words := strings.Fields(text)

	var chunks []string

	for i := 0; i < len(words); i += size {

		end := min(i+size, len(words))

		chunks = append(
			chunks,
			strings.Join(words[i:end], " "),
		)

	}

	return chunks

}
