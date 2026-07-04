# ==========================
# Development Stage
# ==========================
FROM golang:1.26-alpine AS development

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go install github.com/air-verse/air

COPY . .

EXPOSE 8080

CMD ["air"]

# ==========================
# Builder Stage
# ==========================
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o server \
    ./cmd/api

# ==========================
# Production Stage
# ==========================
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /

COPY --from=builder /app/server /server

USER nonroot:nonroot

EXPOSE 8080

ENTRYPOINT ["/server"]