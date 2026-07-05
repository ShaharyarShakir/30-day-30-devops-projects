# Local Development Setup Guide

This document describes how to boot the **Resume AI Platform** locally using Docker Compose for development and validation.

---

## 1. Prerequisites
- Docker & Docker Compose installed.
- Python 3.11+ (virtual environment recommended).
- `go` 1.22+ (if editing the Gateway/Auth services).

---

## 2. Booting Services

To start all platform microservices and support stacks (databases, message queues, storage):

1. **Build and start the stack**:
   ```bash
   make up
   ```
   This commands builds:
   - `postgres` (database + pgvector)
   - `garage` (MinIO alternative S3 object store)
   - `garage-init` (automates bucket creation)
   - `mlflow` (tracking server)
   - `redis` (cache store)
   - `kafka` (message bus)
   - `auth-service` (Go auth backend)
   - `resume-service` (Python upload API)
   - `ml-service` (Python ranker API)
   - `resume-worker` (Async task worker)
   - `gateway` (Go API Gateway on port 8080)

2. **Verify running containers**:
   ```bash
   make status
   ```

3. **Check container logs**:
   ```bash
   make logs
   ```

---

## 3. Local Verification Run

Run the end-to-end integration test locally:

### Step 1: User Registration
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "recruiter@resume-ai.local", "password": "securepassword", "role": "recruiter"}'
```

### Step 2: Login to obtain JWT token
```bash
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "recruiter@resume-ai.local", "password": "securepassword"}' | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
```

### Step 3: Upload Resume
```bash
curl -X POST http://localhost:8080/api/resumes \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_resume.pdf"
```

### Step 4: Verify parsing & embeddings
Once uploaded, check processing logs in the worker container:
```bash
docker logs resume-ai-worker
```
The status should transition from `uploaded` to `processing` -> `processed` -> `embedded`.

### Step 5: Query Similarity Ranking
Run predictions/similarity searches against candidates:
```bash
curl -X POST http://localhost:8080/api/inference \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resume_id": 1}'
```
This returns the parsed candidate features along with matching scores of top candidates using pgvector distance.

---

## 4. Teardown
To stop all services and clear database volumes:
```bash
make clean
```
