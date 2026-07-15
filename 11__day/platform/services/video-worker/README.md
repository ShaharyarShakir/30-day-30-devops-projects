# Video Worker

A stateless video processing worker that consumes Kafka events, transcodes videos using FFmpeg, generates adaptive HLS streams, and uploads assets to S3-compatible storage.

## Features

- **Kafka Integration**: Consumes upload events and publishes progress/success/failure events
- **Video Transcoding**: FFmpeg-based transcoding with adaptive bitrate HLS generation
- **Thumbnail Generation**: Cover, preview, and sprite thumbnails
- **Metadata Extraction**: Video metadata extraction using ffprobe
- **S3 Storage**: Garage S3 integration for download and upload
- **Observability**: OpenTelemetry tracing with Jaeger
- **Stateless Design**: Horizontal scaling via Kubernetes HPA

## Architecture

```
Kafka (media.upload.completed)
    ↓
Video Worker
    ↓
Download Original (S3)
    ↓
Validate & Probe (ffprobe)
    ↓
Transcode (FFmpeg)
    ↓
Generate HLS (adaptive bitrates)
    ↓
Generate Thumbnails
    ↓
Upload Assets (S3)
    ↓
Kafka (media.processing.finished)
```

## Configuration

Configuration is managed via YAML file with environment variable overrides:

```yaml
server:
  environment: development
  log_level: info

kafka:
  brokers:
    - localhost:9092
  consumer_group: video-worker
  topics:
    upload_completed: media.upload.completed
    processing_progress: media.processing.progress
    processing_finished: media.processing.finished
    processing_failed: media.processing.failed

storage:
  endpoint: http://localhost:3900
  access_key: garage
  secret_key: secret-key
  bucket: media
  region: us-east-1
  use_ssl: false
  force_path_style: true

ffmpeg:
  path: ffmpeg
  ffprobe_path: ffprobe
  timeout: 30m
  segment_time: 6
  renditions:
    - name: "1080p"
      width: 1920
      height: 1080
      bitrate: "5000k"
      audio_rate: "192k"
    - name: "720p"
      width: 1280
      height: 720
      bitrate: "3000k"
      audio_rate: "128k"
    - name: "480p"
      width: 854
      height: 480
      bitrate: "1500k"
      audio_rate: "128k"
    - name: "360p"
      width: 640
      height: 360
      bitrate: "800k"
      audio_rate: "96k"

worker:
  temp_dir: /tmp/media
  max_concurrent: 1
  retry_attempts: 3
  retry_delay: 5s
  cleanup_on_exit: true

telemetry:
  enabled: true
  service_name: video-worker
  jaeger:
    endpoint: http://localhost:14268/api/traces
```

## Environment Variables

- `CONFIG_PATH`: Path to config file (default: internal/config/config.yaml)
- `KAFKA_BROKERS`: Comma-separated Kafka broker addresses
- `STORAGE_ENDPOINT`: S3-compatible storage endpoint
- `STORAGE_ACCESS_KEY`: Storage access key
- `STORAGE_SECRET_KEY`: Storage secret key
- `STORAGE_BUCKET`: Storage bucket name

## Running Locally

```bash
# Install dependencies
go mod download

# Run worker
go run cmd/worker/main.go
```

## Docker

```bash
# Build image
docker build -t video-worker .

# Run container
docker run -d \
  -e KAFKA_BROKERS=localhost:9092 \
  -e STORAGE_ENDPOINT=http://localhost:3900 \
  -e STORAGE_ACCESS_KEY=garage \
  -e STORAGE_SECRET_KEY=secret-key \
  -e STORAGE_BUCKET=media \
  -v /tmp/media:/tmp/media \
  video-worker
```

## Docker Compose

```bash
docker-compose up -d
```

## Scaling

The worker is designed to be stateless and can be scaled horizontally:

```bash
# Scale to 3 replicas
kubectl scale deployment video-worker --replicas=3

# Or use HPA based on Kafka lag
kubectl autoscale deployment video-worker --cpu-percent=70 --min=1 --max=10
```

## Events

### Input Event: media.upload.completed

```json
{
  "mediaId": "...",
  "storageKey": "...",
  "ownerId": "..."
}
```

### Output Event: media.processing.progress

```json
{
  "mediaId": "...",
  "progress": 50,
  "message": "Transcoding"
}
```

### Output Event: media.processing.finished

```json
{
  "mediaId": "...",
  "duration": 1280,
  "playlist": "media/123/master.m3u8",
  "width": 1920,
  "height": 1080,
  "codec": "h264",
  "bitrate": 5000,
  "frameRate": 30.0
}
```

### Output Event: media.processing.failed

```json
{
  "mediaId": "...",
  "error": "Transcoding failed: ..."
}
```

## Output Structure

```
media/
  {mediaId}/
    master.m3u8
    1080p/
      index.m3u8
      segment_000.ts
      segment_001.ts
      ...
    720p/
      index.m3u8
      segment_000.ts
      ...
    480p/
      ...
    360p/
      ...
    thumbs/
      cover.jpg
      preview.jpg
      sprite.jpg
```

## Development

```bash
# Run tests
go test ./...

# Lint
golangci-lint run

# Format
go fmt ./...
```

## License

MIT
