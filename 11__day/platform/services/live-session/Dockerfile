FROM golang:1.25-alpine AS builder

ENV GOTOOLCHAIN=go1.25.0

WORKDIR /app

# Install git for downloading dependencies
RUN apk add --no-cache git

COPY go.mod ./
COPY go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o live-session-service ./cmd/api

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/live-session-service .

EXPOSE 5004

CMD ["./live-session-service"]
