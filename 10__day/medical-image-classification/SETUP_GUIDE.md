# Production-Style Portfolio Setup with Garage & MLflow

This setup implements a production-grade architecture for the medical image classification project, closely resembling enterprise MLflow deployments.

## Architecture

```
                    Browser
                       │
          ┌────────────┴─────────────┐
          ▼                          ▼
      React Frontend            FastAPI API
         (Nginx)                      │
                                     ▼
                                TensorFlow Model
                                      │
         ┌──────────────┬─────────────┴──────────────┐
         ▼              ▼                            ▼
      MLflow      PostgreSQL                   Garage (S3)
         │              │                            │
         └──────────────┴────────────────────────────┘
```

## Services Overview

| Service | Purpose | Port |
|---------|---------|------|
| **PostgreSQL** | MLflow backend database (experiments, runs, metrics) | 5432 |
| **Garage** | S3-compatible artifact storage (models, plots, reports) | 3900 |
| **Garage UI** | Web interface for Garage management | 3000 |
| **MLflow** | Experiment tracking & model registry | 5000 |
| **FastAPI Backend** | Model inference API | 8000 |
| **React Frontend** | Web UI (served by Nginx) | 5173 |

## Project Structure

```
medical-image-classification/
├── .env                          # Environment variables
├── docker-compose.yml            # Docker orchestration
├── docker/
│   ├── garage/
│   │   └── garage.toml          # Garage S3 storage config
│   ├── nginx/
│   │   ├── nginx.conf           # Nginx main config
│   │   └── default.conf         # Nginx site config
│   ├── postgres/
│   │   └── init.sql             # PostgreSQL initialization
│   └── minio/
│       └── .gitkeep
├── backend/
│   ├── Dockerfile               # Backend container image
│   ├── pyproject.toml           # Python dependencies
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── mlflow_config.py # MLflow integration
│   │   ├── services/
│   │   └── schemas/
│   └── models/                  # Model storage
├── frontend/
│   ├── Dockerfile               # Frontend container image
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
└── README.md
```

## Getting Started

### 1. Environment Configuration

The `.env` file is pre-configured with:

```env
POSTGRES_USER=mlflow
POSTGRES_PASSWORD=mlflow123
POSTGRES_DB=mlflow

GARAGE_RPC_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
GARAGE_ADMIN_TOKEN=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

AWS_ACCESS_KEY_ID=garage
AWS_SECRET_ACCESS_KEY=garage123456

MLFLOW_S3_ENDPOINT_URL=http://garage:3900
```

**For production**, generate secure tokens:

```bash
# Generate 64-character hex strings
openssl rand -hex 32  # Repeat twice for GARAGE_RPC_SECRET and GARAGE_ADMIN_TOKEN
```

### 2. Start All Services

```bash
docker compose up -d --build
```

Verify containers are running:

```bash
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE                      NAMES
...            postgres:16               medical-image-classification-postgres-1
...            dxkwxn/garage:latest      medical-image-classification-garage-1
...            dxkwxn/garage-ui:latest   medical-image-classification-garage-ui-1
...            ghcr.io/mlflow/mlflow     medical-image-classification-mlflow-1
...            (backend image)           medical-image-classification-backend-1
...            nginx:alpine              medical-image-classification-frontend-1
```

### 3. Access the Services

After services are healthy (wait 30-60 seconds for MLflow initialization):

| Service | URL | Purpose |
|---------|-----|---------|
| **React Frontend** | http://localhost:5173 | Web UI for predictions |
| **FastAPI Docs** | http://localhost:8000/docs | API documentation (Swagger) |
| **MLflow UI** | http://localhost:5000 | Experiment tracking & model registry |
| **Garage UI** | http://localhost:3000 | Object storage management |
| **PostgreSQL** | localhost:5432 | Direct database access |

### 4. Verify Setup

Check backend health:
```bash
curl http://localhost:8000/api/v1/health
```

Check MLflow:
```bash
curl http://localhost:5000/
```

### 5. Backend Integration

The backend automatically connects to MLflow via the environment variable:

```python
from app.core.mlflow_config import mlflow_config

# Initialize MLflow
mlflow_config.setup()

# Create an experiment
exp_id = mlflow_config.create_experiment("medical-imaging")

# Log a run
run_id = mlflow_config.log_run(
    experiment_name="medical-imaging",
    run_name="baseline-model",
    params={"epochs": 50, "batch_size": 32},
    metrics={"accuracy": 0.95, "loss": 0.12},
    artifacts={"reports": "/path/to/reports"}
)
```

## Data Persistence

Named volumes preserve data across restarts:

```yaml
volumes:
  postgres_data:    # MLflow experiments & metrics
  garage_data:      # Model artifacts & plots
```

Even after `docker compose down`, your data remains. To remove everything:

```bash
docker compose down -v
```

## Production Deployment

### Add Reverse Proxy

For a production-ready setup, add an Nginx reverse proxy with:

- **Single entry point** (http://localhost)
- **Path-based routing**:
  - `/` → React frontend
  - `/api` → FastAPI backend
  - `/mlflow` → MLflow UI
  - `/storage` → Garage UI
- **TLS support** for HTTPS
- **Compression & caching**

### Next Steps

1. **Generate secure credentials** (.env file)
2. **Configure domain names** (DNS, TLS certificates)
3. **Set up CI/CD pipeline** (GitHub Actions, GitLab CI)
4. **Add monitoring** (Prometheus, Grafana)
5. **Deploy to Kubernetes** (Helm charts)

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs -f mlflow
docker compose logs -f postgres
docker compose logs -f garage
```

### MLflow can't access Garage

Verify S3 environment variables:
```bash
docker compose exec backend env | grep AWS
```

### Database connection issues

Check PostgreSQL is healthy:
```bash
docker compose exec postgres pg_isready -U mlflow
```

### Clear everything and restart

```bash
docker compose down -v
docker compose up -d --build
```

## Security Considerations

1. **Change default credentials** in `.env`
2. **Use strong passwords** for all services
3. **Enable TLS/SSL** for production
4. **Restrict network access** (firewall rules)
5. **Rotate access keys** regularly
6. **Enable audit logging** (PostgreSQL, MLflow)
7. **Use secrets management** (HashiCorp Vault, AWS Secrets Manager)

## Performance Tuning

### PostgreSQL

```bash
# Access PostgreSQL shell
docker compose exec postgres psql -U mlflow -d mlflow

# Check performance
SELECT * FROM pg_stat_statements;
```

### Garage

Monitor storage via Garage UI (http://localhost:3000)

### MLflow

Optimize artifact uploads:
- Use batch operations
- Monitor S3 throughput
- Configure connection pooling

## File Descriptions

| File | Purpose |
|------|---------|
| `.env` | Environment variables for all services |
| `docker-compose.yml` | Container orchestration & networking |
| `docker/garage/garage.toml` | Garage S3 storage configuration |
| `docker/nginx/nginx.conf` | Nginx reverse proxy main config |
| `docker/nginx/default.conf` | Frontend routing & API proxying |
| `docker/postgres/init.sql` | PostgreSQL initialization script |
| `backend/Dockerfile` | Build FastAPI backend container |
| `frontend/Dockerfile` | Build React frontend container (multi-stage) |
| `app/core/mlflow_config.py` | Python MLflow integration module |

## References

- [MLflow Documentation](https://mlflow.org/docs)
- [Garage Documentation](https://garagehq.deuxfleurs.fr/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
