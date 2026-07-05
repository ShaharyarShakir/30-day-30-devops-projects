# System Architecture

This document describes the design and routing flow of the **Resume AI Platform**.

## Final Architecture Diagram

```
                 Users
                    │
              NGINX Ingress
                    │
          Go API Gateway [8080]
                    │
    ┌──────────┬───────────┬───────────┐
    ▼          ▼           ▼           ▼
 Auth      Resume      ML Service   (Feature Store /
 Service   Service     [8083]        Feast Store)
 [8081]    [8082]          │
                │          ▼
                ▼      KServe Model
            RabbitMQ   [candidate-ranker]
            / Kafka        │
                │          ▼
                ▼      PostgreSQL + pgvector
         Resume Worker
                │
                ▼
         Garage / MinIO
```

## System Components

### 1. API Gateway
- Written in Go.
- Serves as the single entry point (`:8080`).
- Implements token-bucket rate limiting in memory.
- Decodes JWT tokens, validates claims, extracts user IDs and roles, and propagates them downstream via:
  - `X-User-ID`
  - `X-User-Email`
  - `X-User-Role`
- Enforces Role-Based Access Control (RBAC):
  - Requires `recruiter` or `admin` role for `/api/inference` (similarity ranking) and admin panels.
  - Allows `candidate` to upload and inspect their own profile.
- Handles distributed tracing: generates and injects W3C `traceparent` headers if not already present.

### 2. Auth Service
- Written in Go (`net/http`).
- Manages user registration, login, and profile fetching.
- Saves user credentials in PostgreSQL.
- Performs bcrypt password hashing.
- Encodes roles (`admin`, `recruiter`, `candidate`) directly in JWT claims.

### 3. Resume Service
- Written in Python (FastAPI).
- Handles PDF resume uploads and deletions.
- Saves PDF binaries to MinIO/Garage object storage.
- Records metadata in PostgreSQL.
- Publishes `resume-uploaded` event payload to Kafka.
- Includes the OTel `trace_id` in the Kafka message to preserve the trace path.

### 4. Resume Worker
- Written in Python (standalone event consumer).
- Subscribes to Kafka `resume-uploaded` topic.
- Downloads PDF from MinIO/Garage.
- Extracts text, parses section fields (skills, experience, education).
- Calls embedding generation.
- Stores features and vector embeddings (pgvector) in PostgreSQL.
- Context propagation: extracts the `trace_id` from the Kafka message and wraps the processing logic in a child trace span.

### 5. ML Service
- Written in Python (FastAPI).
- Performs candidate similarity ranking using pgvector distance operations.
- Interacts with MLflow and Feast for feature store ingestion.

## Observability & Security

### Tracing Flow
Distributed tracing flows from:
`Frontend -> Gateway -> Resume Service -> Kafka -> Resume Worker -> ML Service -> PostgreSQL`.

Spans are gathered using OpenTelemetry and exported to a Jaeger OTLP collector.

### Security Layout
- **Network Policies**: Restrict pod-to-pod communications. Only the API Gateway is exposed.
- **Secrets Management**: Secrets are mounted dynamically into pods via HashiCorp Vault Agent sidecars.
- **TLS**: Ingress traffic is encrypted using `cert-manager` with Let's Encrypt CA validation.
