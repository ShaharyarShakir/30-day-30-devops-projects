FROM golang:1.25-alpine AS builder

ENV GOTOOLCHAIN=go1.25.0

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o coding-service ./cmd/api

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/coding-service .

EXPOSE 5007

CMD ["./coding-service"]
