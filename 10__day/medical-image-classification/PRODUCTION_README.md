# Production-Grade Medical Image Classification Portfolio

A production-style portfolio project featuring MLflow experiment tracking, Garage S3-compatible storage, PostgreSQL backend database, FastAPI inference API, and React frontend—resembling enterprise deployments.

## Quick Start

```bash
# Start all services
./start.sh

# Or manually
docker compose up -d --build

# Check services
docker ps
```

Then visit:
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **MLflow**: http://localhost:5000
- **Garage UI**: http://localhost:3000

## Architecture Highlights

### Why This Stack?

| Component | Why | Alternative |
|-----------|-----|-------------|
| **MLflow** | Industry-standard experiment tracking | Weights & Biases, Neptune |
| **Garage** | Open-source S3-compatible storage | MinIO, LocalStack |
| **PostgreSQL** | Reliable backend for MLflow metadata | SQLite (dev only) |
| **FastAPI** | Modern async Python API framework | Flask, Django |
| **React + Vite** | Fast, modern frontend development | Vue, Angular |
| **Nginx** | Production-grade reverse proxy | Apache, Caddy |
| **Docker Compose** | Multi-container orchestration | Kubernetes (next step) |

### Data Flow

```
User Request
     │
     ▼
React Frontend (Nginx)
     │
     ├─→ Static assets (cached)
     └─→ API calls /api/* (proxied)
            │
            ▼
         FastAPI Backend
            │
            ├─→ Load TensorFlow model
            ├─→ Run inference
            ├─→ Log to MLflow
            └─→ Store artifacts in Garage
                 │
                 ├─→ PostgreSQL (metadata)
                 └─→ Garage S3 (model files, plots)
```

## Environment Setup

All services are configured via `.env`:

```env
# Database
POSTGRES_USER=mlflow
POSTGRES_PASSWORD=mlflow123
POSTGRES_DB=mlflow

# Garage S3 Storage
GARAGE_RPC_SECRET=<64-char-hex>
GARAGE_ADMIN_TOKEN=<64-char-hex>
AWS_ACCESS_KEY_ID=garage
AWS_SECRET_ACCESS_KEY=garage123456

# S3 Endpoint
MLFLOW_S3_ENDPOINT_URL=http://garage:3900
```

**For production**, use strong credentials:

```bash
# Generate secure tokens
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Service Details

### PostgreSQL (Port 5432)

Stores MLflow metadata:
- Experiments and runs
- Parameters and metrics
- Model versions and tags

```bash
# Connect to database
docker compose exec postgres psql -U mlflow -d mlflow

# Example query
SELECT * FROM experiments;
```

### Garage (Port 3900) with Garage UI (Port 3000)

S3-compatible object storage for:
- Model artifacts (`.keras`, `.pb` files)
- Training plots and reports
- Experiment artifacts

```bash
# Access Garage UI
# http://localhost:3000

# Create bucket via API
aws s3 mb s3://mlflow --endpoint-url http://localhost:3900
```

### MLflow (Port 5000)

Experiment tracking and model registry:
- Track runs and hyperparameters
- Compare metrics across experiments
- Register and deploy models
- Serve models via REST API

```bash
# View experiments
curl http://localhost:5000/api/2.0/experiments/list

# Create experiment
curl -X POST http://localhost:5000/api/2.0/experiments/create \
  -H "Content-Type: application/json" \
  -d '{"name": "medical-imaging"}'
```

### FastAPI Backend (Port 8000)

RESTful API for model inference:

```bash
# API documentation
http://localhost:8000/docs

# Health check
curl http://localhost:8000/api/v1/health

# Example: Make prediction
curl -F "file=@image.png" http://localhost:8000/api/v1/predict
```

### React Frontend (Port 5173)

Web UI for:
- Image upload and preview
- Real-time predictions
- Confidence scores
- GradCAM explainability
- Training metrics dashboard

### Nginx Reverse Proxy

Serves React frontend and proxies API calls:
- Static file caching (30 days for assets)
- SPA routing (all routes → index.html)
- API proxying (/api → backend:8000)
- Security headers (X-Frame-Options, CSP)
- Compression (gzip)

## MLflow Integration in Backend

The backend automatically integrates with MLflow:

```python
from app.core.mlflow_config import mlflow_config

# Initialize
mlflow_config.setup()

# Log experiment run
mlflow_config.log_run(
    experiment_name="pneumonia-detection",
    run_name="baseline-v1",
    params={
        "model": "ResNet50",
        "epochs": 50,
        "batch_size": 32,
        "learning_rate": 0.001,
    },
    metrics={
        "accuracy": 0.96,
        "precision": 0.94,
        "recall": 0.98,
        "f1_score": 0.96,
    },
    artifacts={
        "reports": "/app/artifacts/classification_report.txt",
        "history": "/app/artifacts/history.csv",
    }
)
```

## Development Workflow

### Local Development (without Docker)

```bash
# Backend
cd backend
pip install -e .
pip install mlflow boto3
export MLFLOW_TRACKING_URI=http://localhost:5000
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Docker Development

```bash
# Rebuild after changes
docker compose up -d --build

# View logs
docker compose logs -f backend

# Shell into container
docker compose exec backend bash
```

## Production Deployment

### Prerequisites

1. **Docker & Docker Compose** installed
2. **Domain name** (for TLS certificates)
3. **Cloud provider** (AWS, GCP, Azure, etc.)

### Deployment Steps

1. **Generate secure credentials**
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))" > .env.prod
   ```

2. **Configure TLS/SSL**
   ```bash
   # Use Let's Encrypt with Certbot
   certbot certonly --standalone -d your-domain.com
   ```

3. **Update docker-compose.yml**
   - Add reverse proxy service (Traefik or Nginx)
   - Enable TLS/SSL termination
   - Configure health checks

4. **Deploy to cloud**
   ```bash
   # Push to container registry
   docker login
   docker push your-registry/medical-classification:latest
   
   # Deploy (example: AWS ECS)
   aws ecs create-service --cluster production \
     --service-name medical-classification \
     --task-definition medical-classification:1
   ```

## Monitoring & Logging

### MLflow Dashboard

Track all experiments:
```
http://localhost:5000
```

### View Container Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f mlflow
docker compose logs -f postgres

# Filter by keyword
docker compose logs | grep ERROR
```

### Database Monitoring

```bash
# PostgreSQL stats
docker compose exec postgres psql -U mlflow -d mlflow \
  -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC;"
```

## Troubleshooting

### Services won't start

```bash
# Check for port conflicts
lsof -i :5173  # Frontend
lsof -i :8000  # Backend
lsof -i :5000  # MLflow

# Clear and restart
docker compose down -v
docker compose up -d --build
```

### MLflow can't find Garage

```bash
# Verify S3 credentials in backend container
docker compose exec backend env | grep AWS

# Test S3 connection
docker compose exec backend python3 << 'EOF'
import boto3
s3 = boto3.client('s3', 
  endpoint_url='http://garage:3900',
  aws_access_key_id='garage',
  aws_secret_access_key='garage123456'
)
s3.create_bucket(Bucket='test')
print("✅ S3 connection works!")
EOF
```

### Database connection issues

```bash
# Check PostgreSQL health
docker compose exec postgres pg_isready -U mlflow

# Connect to database
docker compose exec postgres psql -U mlflow -d mlflow

# Check MLflow tables
SELECT * FROM experiments;
```

## File Structure

```
medical-image-classification/
├── .env                           # Environment variables
├── docker-compose.yml             # Multi-container setup
├── start.sh                       # Quick start script
├── SETUP_GUIDE.md                 # Detailed setup documentation
├── docker/
│   ├── garage/
│   │   └── garage.toml           # Garage config
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── default.conf
│   └── postgres/
│       └── init.sql
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── health.py
│   │   │       └── predict.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── mlflow_config.py # MLflow integration ⭐
│   │   ├── schemas/
│   │   ├── services/
│   │   └── explainability/
│   └── models/                   # Keras model storage
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── components/
│       ├── features/
│       ├── lib/
│       ├── routes/
│       ├── services/
│       └── types/
└── README.md
```

## Key Features

✅ **MLflow Integration** - Experiment tracking & model registry  
✅ **S3-Compatible Storage** - Garage for artifact management  
✅ **PostgreSQL Backend** - Reliable metadata storage  
✅ **FastAPI** - Modern async Python API framework  
✅ **React Frontend** - Interactive web UI with Vite  
✅ **Docker Compose** - Easy multi-container orchestration  
✅ **Nginx Reverse Proxy** - Production-grade routing  
✅ **Health Checks** - Automatic service monitoring  
✅ **Data Persistence** - Named volumes for data survival  
✅ **Security Headers** - CORS, CSP, X-Frame-Options  

## Performance Tips

1. **MLflow**: Use batch logging for metrics
2. **Garage**: Monitor storage usage via UI
3. **PostgreSQL**: Index frequently queried columns
4. **FastAPI**: Cache model in memory between requests
5. **React**: Use React DevTools profiler for optimization
6. **Nginx**: Enable compression for static assets

## Next Steps

1. **Add CI/CD**: GitHub Actions → Docker Hub → Cloud Deployment
2. **Add Monitoring**: Prometheus + Grafana for metrics
3. **Add Logging**: ELK stack (Elasticsearch, Logstash, Kibana)
4. **Kubernetes**: Convert to Helm charts for production scale
5. **Authentication**: Add OAuth2/JWT for API security
6. **Database Backups**: Automated PostgreSQL backups
7. **Load Testing**: JMeter or Locust for performance testing

## References

- [MLflow Docs](https://mlflow.org/docs)
- [Garage Docs](https://garagehq.deuxfleurs.fr/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Nginx Docs](https://nginx.org/en/docs/)

---

**Author**: Your Name  
**Project**: Medical Image Classification  
**Portfolio Status**: Production-Ready 🚀
