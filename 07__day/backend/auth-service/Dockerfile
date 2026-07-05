# Builder stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git/certs
RUN apk add --no-cache git ca-certificates

COPY go.mod ./
# Fetch dependencies (can go mod tidy or download)
RUN go mod download

COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o auth-service cmd/main.go

# Final stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/auth-service .

EXPOSE 8081

ENV PORT=8081

CMD ["./auth-service"]
