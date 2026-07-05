FROM python:3.11-slim

RUN pip install --no-cache-dir \
    mlflow==2.14.1 \
    psycopg2-binary==2.9.9 \
    boto3==1.34.144

EXPOSE 5000

# Backend store (Postgres) and artifact root (MinIO/S3) are passed in
# via env vars at runtime from docker-compose, so this image stays generic.
CMD mlflow server \
    --host 0.0.0.0 \
    --port 5000 \
    --backend-store-uri "${MLFLOW_BACKEND_STORE_URI}" \
    --default-artifact-root "${MLFLOW_ARTIFACT_ROOT}" \
    --serve-artifacts
