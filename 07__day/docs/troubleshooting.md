# Troubleshooting & Runbook Guide

This runbook covers common failure modes and recovery procedures for the **Resume AI Platform**.

## 1. Trace Inspection (Distributed Tracing)

Distributed traces allow tracking down exact service failure points. 

### Locate a Trace ID
1. Retrieve failed request logs from the Gateway container (JSON format).
2. Find the `"trace_id"` value in the logs.
3. Access the Jaeger UI (e.g. `http://jaeger.resume-ai.local`).
4. Search for the `"trace_id"` in the search bar. This displays the full request path spanning the Gateway, Resume Service, Kafka queues, and the ML prediction.

---

## 2. Check Logs (Structured JSON)

All microservices output logs in structured JSON format. Run the following log filters:

### API Gateway logs
```bash
kubectl logs -n resume-ai -l app=gateway --tail=100
# Filter for 5xx errors:
kubectl logs -n resume-ai -l app=gateway --tail=500 | grep '"status":5'
```

### Resume Service/Worker logs
```bash
kubectl logs -n resume-ai -l app=resume-service --tail=100
kubectl logs -n resume-ai -l app=resume-worker --tail=100
```

---

## 3. Common Issues & Recoveries

### Problem: Resume uploads remain stuck in "processing" status
- **Root Cause**: The Kafka broker is unreachable, or the `resume-worker` pod has crashed or cannot consume messages.
- **Recovery Steps**:
  1. Check Kafka health:
     ```bash
     kubectl get pods -n resume-ai -l app=kafka
     ```
  2. Verify worker connectivity:
     ```bash
     kubectl logs -n resume-ai -l app=resume-worker
     ```
     Ensure there are no `ConnectionRefused` or `BrokerNotAvailable` errors.
  3. Restart the consumer group if needed:
     ```bash
     kubectl rollout restart deployment resume-worker -n resume-ai
     ```

### Problem: Postgres pgvector similarity search fails/times out
- **Root Cause**: Database indexes are out of sync or pgvector extension is missing.
- **Recovery Steps**:
  1. Inspect Postgres logs:
     ```bash
     kubectl logs -n resume-ai -l app=postgres
     ```
  2. Exec into the Postgres pod and verify pgvector extension exists:
     ```bash
     kubectl exec -it -n resume-ai deploy/postgres -- psql -U postgres -d resume_ai -c "\dx"
     ```
     Ensure `pgvector` is listed. If missing, run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

### Problem: Inference service cold start delays (timeouts on first request)
- **Root Cause**: Knative scales replicas to zero due to inactivity (configured in staging).
- **Recovery Steps**:
  - In production, ensure the `min-scale` annotation is set to `"1"` or higher to keep at least one instance running. Verify in `kustomize/overlays/production/patch-inferenceservice.yaml`.
