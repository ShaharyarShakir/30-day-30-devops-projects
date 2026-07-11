# Event-Driven Architecture

We utilize Apache Kafka for event-driven, asynchronous messaging between microservices.

## Event Specifications

### Kafka Topic: `user.events`

Emitted by the **Auth Service** when user states change.

#### Event: `user.created`

- **Schema Reference**: `packages/events/user-created.json`
- **Payload**:

```json
{
  "eventId": "uuidv4",
  "eventType": "user.created",
  "timestamp": "ISO8601-String",
  "data": {
    "userId": "uuidv4",
    "email": "user@example.com",
    "displayName": "Jane Doe"
  }
}
```

#### Event: `user.updated`

- **Schema Reference**: `packages/events/user-updated.json`
- **Payload**:

```json
{
  "eventId": "uuidv4",
  "eventType": "user.updated",
  "timestamp": "ISO8601-String",
  "data": {
    "userId": "uuidv4",
    "displayName": "Jane Doe",
    "avatarUrl": "https://s3.platform.local/avatars/user.jpg"
  }
}
```

## Kafka Broker Setup

- Locally configured with single broker KRaft container named `kafka:9092`.
- Default topic replication factor: `1`.
- Auto-topic creation: Enabled for development.
