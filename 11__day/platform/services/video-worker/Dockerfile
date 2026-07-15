# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o worker ./cmd/worker

# Runtime stage
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    ca-certificates \
    tzdata

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/worker .

# Copy config
COPY internal/config/config.yaml ./config.yaml

# Create temp directory
RUN mkdir -p /tmp/media

# Set environment variables
ENV CONFIG_PATH=/app/config.yaml
ENV TEMP_DIR=/tmp/media

# Run as non-root user
RUN addgroup -g 1000 worker && \
    adduser -D -u 1000 -G worker worker
USER worker

# Expose health check port if needed
EXPOSE 8080

# Run the application
CMD ["./worker"]
