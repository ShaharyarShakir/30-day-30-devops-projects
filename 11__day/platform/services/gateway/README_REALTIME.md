# Realtime Gateway Documentation

## Overview

The Realtime Gateway is a centralized WebSocket gateway that handles all real-time communication for the platform. It serves as the single entry point for persistent client connections, providing:

- **Connection Management**: Single WebSocket connection per client
- **Authentication**: JWT-based authentication
- **Presence Tracking**: User and session presence with Redis
- **Room Management**: Isolated traffic for sessions, courses, and chats
- **Message Fan-out**: Real-time message broadcasting
- **Rate Limiting**: Distributed rate limiting using Redis
- **Event Streaming**: Kafka integration for event persistence
- **Metrics**: Observability with built-in metrics collection

## Architecture

```
                     Browser
                        │
              WebSocket (WSS)
                        │
                        ▼
              Realtime Gateway (NestJS)
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
      Redis          Kafka         Live Session
        │               │
        ▼               ▼
      Presence      Event Fanout
```

## Technology Stack

- **NestJS**: Application framework
- **Socket.IO**: WebSocket library with automatic reconnection
- **Redis**: Distributed presence and rate limiting
- **Kafka**: Event streaming for persistence
- **JWT**: Authentication tokens
- **Nginx**: Load balancing for horizontal scaling

## Connection Flow

1. **Client Connects**: WebSocket connection established
2. **JWT Validation**: Token extracted and verified
3. **Device Registration**: Device registered with presence service
4. **User Presence**: User marked as online in Redis
5. **Connection Ready**: Client can join rooms and send events

## WebSocket Events

### Client → Gateway

| Event | Description | Payload |
|-------|-------------|---------|
| `connect` | Initial connection | JWT token |
| `join_room` | Join a room | `{ room, sessionToken? }` |
| `leave_room` | Leave a room | `{ room }` |
| `send_message` | Send chat message | `{ room, content }` |
| `typing` | Typing indicator | `{ room, isTyping }` |
| `reaction` | Emoji reaction | `{ room, emoji }` |
| `heartbeat` | Keep-alive ping | - |

### Gateway → Client

| Event | Description | Payload |
|-------|-------------|---------|
| `connected` | Connection acknowledged | `{ userId }` |
| `joined` | User joined room | `{ room }` or `{ userId }` |
| `left` | User left room | `{ room }` or `{ userId }` |
| `message` | Chat message | `{ room, userId, content, createdAt }` |
| `typing` | Typing indicator | `{ userId, isTyping }` |
| `reaction` | Emoji reaction | `{ userId, emoji }` |
| `error` | Error message | `{ message }` |
| `heartbeat` | Pong response | `{ status: "pong" }` |

## Room Naming Convention

Rooms follow the pattern: `type:id`

- `session:{uuid}` - Live session rooms
- `course:{uuid}` - Course-specific rooms
- `chat:{uuid}` - Chat rooms

## Security Features

### Authentication
- JWT token required on connection
- Token extracted from auth, query, or cookie
- Session token required for live session rooms

### Rate Limiting
- **Messages**: 30/minute per user
- **Typing**: 5/second per user
- **Reactions**: 300/minute per user
- Distributed across gateway instances using Redis

### Validation
- Maximum message size: 10KB
- Maximum rooms per client: 50
- Maximum devices per user: 5
- Room format validation
- Idle connection timeout: 5 minutes

## Configuration

### Environment Variables

```bash
# Core Configuration
NODE_ENV=development
PORT=4000
WEBSOCKET_PORT=4001
JWT_SECRET=your_jwt_secret_here

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Kafka Configuration
KAFKA_BROKER=localhost:9092
KAFKA_REALTIME_EVENTS_TOPIC=platform.realtime-events
KAFKA_CHAT_MESSAGES_TOPIC=platform.chat-messages

# Gateway Configuration
MAX_MESSAGE_SIZE=10000
MAX_ROOMS_PER_CLIENT=50
MAX_DEVICES_PER_USER=5
IDLE_TIMEOUT_MS=300000
HEARTBEAT_INTERVAL_MS=30000
PING_TIMEOUT_MS=60000
PING_INTERVAL_MS=25000

# Rate Limiting
RATE_LIMIT_MESSAGES_PER_MINUTE=30
RATE_LIMIT_TYPING_PER_SECOND=5
RATE_LIMIT_REACTIONS_PER_MINUTE=300
```

## Services

### PresenceService

Manages user and session presence in Redis.

**Key Methods:**
- `setUserPresence(userId, state, ttl)` - Set user presence state
- `getUserPresence(userId)` - Get user presence state
- `registerDevice(userId, socketId, deviceInfo)` - Register device connection
- `unregisterDevice(userId, socketId)` - Unregister device
- `joinRoomPresence(roomId, userId)` - Add user to room
- `leaveRoomPresence(roomId, userId)` - Remove user from room
- `getUserStats(userId)` - Get user presence statistics
- `getRoomStats(roomId)` - Get room presence statistics

### LimiterService

Distributed rate limiting using Redis with token bucket algorithm.

**Key Methods:**
- `isRateLimited(userId, event, limit, refillRate)` - Check rate limit
- `isRoomRateLimited(userId, roomId, event, limit, refillRate)` - Per-room rate limit
- `resetRateLimit(userId, event)` - Reset rate limit
- `getRateLimitStatus(userId, event)` - Get current rate limit status

### KafkaService

Kafka producer for event streaming.

**Key Methods:**
- `emitEvent(topic, key, payload)` - Publish event to Kafka

### MetricsService

Built-in metrics collection for observability.

**Key Methods:**
- `incrementConnectedClients()` - Track connection count
- `incrementMessageCount()` - Track message count
- `incrementEventCount()` - Track event count
- `getMetricsSummary()` - Get all metrics summary
- `calculateRate(name, windowSeconds)` - Calculate rate over time window
- `calculateAverage(name, windowSeconds)` - Calculate average over time window

## Horizontal Scaling

The gateway supports horizontal scaling using:

1. **Redis Adapter**: Socket.IO Redis adapter for cross-instance communication
2. **Distributed Rate Limiting**: Redis-based rate limiting shared across instances
3. **Load Balancer**: Nginx for distributing connections

### Testing Horizontal Scaling

Use the provided Docker Compose configuration:

```bash
cd services/gateway
docker-compose -f docker-compose.realtime.yml up -d
```

This spins up:
- 3 Gateway instances
- Redis for distributed state
- Kafka for event streaming
- Nginx load balancer

## Monitoring

### Metrics Available

- **Connected Clients**: Current number of connected clients
- **Total Connections**: Total connections since start
- **Total Disconnections**: Total disconnections since start
- **Total Messages**: Total messages sent
- **Total Events**: Total events sent
- **Total Errors**: Total errors encountered
- **Messages/Second**: Message rate over last 60 seconds
- **Events/Second**: Event rate over last 60 seconds
- **Errors/Second**: Error rate over last 60 seconds
- **Average Redis Latency**: Average Redis operation latency
- **Average Kafka Latency**: Average Kafka operation latency
- **Reconnect Rate**: Reconnection rate

### Accessing Metrics

Metrics are available via the MetricsService. In production, integrate with:
- Prometheus + Grafana
- Datadog
- New Relic
- OpenTelemetry

## Development

### Running Locally

```bash
cd services/gateway
pnpm install
pnpm dev
```

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

## Production Deployment

### Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure Redis with persistence
- [ ] Configure Kafka with proper replication
- [ ] Enable TLS/SSL for WebSocket connections
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up backup and disaster recovery
- [ ] Configure rate limits appropriately
- [ ] Enable IP whitelisting for metrics endpoint
- [ ] Set up health checks

### Scaling Recommendations

- Start with 2-3 gateway instances
- Scale based on connection count (target: 10K connections per instance)
- Use Redis Cluster for high availability
- Use Kafka with multiple partitions for high throughput
- Monitor Redis and Kafka latency

## Troubleshooting

### High Redis Latency
- Check Redis memory usage
- Monitor Redis connection pool
- Consider Redis Cluster for high load

### High Kafka Lag
- Increase Kafka partitions
- Check consumer group lag
- Monitor Kafka broker health

### Connection Drops
- Check idle timeout configuration
- Monitor network stability
- Review load balancer configuration

### Rate Limit Issues
- Adjust rate limits based on usage patterns
- Monitor rate limit hit rates
- Consider per-room rate limits for high-traffic rooms

## Future Enhancements

- [ ] OpenTelemetry integration
- [ ] WebRTC signaling support
- [ ] Message persistence in gateway (optional)
- [ ] Advanced room permissions
- [ ] Message encryption
- [ ] Geographic load balancing
- [ ] Connection pooling optimization
- [ ] Custom event validation middleware

## Related Services

- **Identity Service**: JWT token issuance
- **Chat Service**: Message persistence
- **Live Session Service**: Session management
- **Media Service**: Video/audio streaming (future)

## Support

For issues or questions, refer to the main platform documentation or contact the development team.
