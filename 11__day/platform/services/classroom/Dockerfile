FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install git for downloading dependencies
RUN apk add --no-cache git

COPY go.mod ./
COPY go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o classroom-service ./cmd/api

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/classroom-service .

EXPOSE 5003

CMD ["./classroom-service"]
