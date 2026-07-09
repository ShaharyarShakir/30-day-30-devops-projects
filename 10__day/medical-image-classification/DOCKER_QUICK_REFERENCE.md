# Docker Compose Quick Reference

## Start Services

### Quick Start (Recommended)
```bash
./start.sh
```

### Manual Start
```bash
docker compose up -d --build
```

### Start Specific Service
```bash
docker compose up -d postgres
docker compose up -d garage
docker compose up -d mlflow
docker compose up -d backend
docker compose up -d frontend
```

---

## View Logs

### All Logs (Real-time)
```bash
docker compose logs -f
```

### Specific Service
```bash
docker compose logs -f backend
docker compose logs -f mlflow
docker compose logs -f postgres
docker compose logs -f garage
```

### Last 100 Lines
```bash
docker compose logs --tail=100 backend
```

### Filter by Keyword
```bash
docker compose logs | grep ERROR
docker compose logs | grep WARNING
```

---

## Service Status

### List All Containers
```bash
docker compose ps
```

### Check Specific Service
```bash
docker compose exec postgres pg_isready -U mlflow
docker compose exec backend curl http://localhost:8000/api/v1/health
```

---

## Execute Commands in Container

### Shell into Backend
```bash
docker compose exec backend bash
```

### Shell into PostgreSQL
```bash
docker compose exec postgres bash
```

### Run Python in Backend
```bash
docker compose exec backend python3 << 'EOF'
import os
print(f"MLflow URI: {os.getenv('MLFLOW_TRACKING_URI')}")
print(f"S3 Endpoint: {os.getenv('AWS_S3_ENDPOINT_URL')}")
EOF
```

### Query Database
```bash
docker compose exec postgres psql -U mlflow -d mlflow -c "SELECT * FROM experiments;"
```

---

## Stop Services

### Stop All (Keep Data)
```bash
docker compose down
```

### Stop & Remove Everything (Including Data)
```bash
docker compose down -v
```

### Stop Specific Service
```bash
docker compose stop backend
docker compose stop mlflow
```

---

## Restart Services

### Restart All
```bash
docker compose restart
```

### Restart Specific Service
```bash
docker compose restart backend
docker compose restart mlflow
```

---

## Rebuild Images

### Rebuild All
```bash
docker compose up -d --build
```

### Rebuild Specific Service
```bash
docker compose up -d --build backend
docker compose up -d --build frontend
```

### Force Rebuild (Ignore Cache)
```bash
docker compose build --no-cache
docker compose up -d
```

---

## View Service Health

### Docker Compose Status
```bash
docker compose ps
```

Output shows:
- ✅ "Up" = Running
- ❌ "Exit X" = Crashed
- Ports = Exposed services

### Health Checks
```bash
# Frontend
curl http://localhost:5173/health

# Backend
curl http://localhost:8000/api/v1/health

# MLflow
curl http://localhost:5000/

# Garage
curl http://localhost:3900/

# PostgreSQL
docker compose exec postgres pg_isready -U mlflow
```

---

## View Resource Usage

### CPU & Memory
```bash
docker stats
```

### Volume Usage
```bash
docker volume ls
docker volume inspect medical-image-classification_postgres_data
docker volume inspect medical-image-classification_garage_data
```

---

## Debugging

### Check Environment Variables
```bash
docker compose exec backend env
docker compose exec backend env | grep MLFLOW
docker compose exec backend env | grep AWS
```

### Check File System
```bash
docker compose exec backend ls -la /app
docker compose exec postgres ls -la /var/lib/postgresql
```

### Test S3 Connection
```bash
docker compose exec backend python3 << 'EOF'
import boto3
s3 = boto3.client('s3',
  endpoint_url='http://garage:3900',
  aws_access_key_id='garage',
  aws_secret_access_key='garage123456'
)
response = s3.list_buckets()
print(f"Buckets: {[b['Name'] for b in response['Buckets']]}")
EOF
```

### Verify MLflow Connection
```bash
docker compose exec backend python3 << 'EOF'
import mlflow
mlflow.set_tracking_uri('http://mlflow:5000')
experiments = mlflow.search_experiments()
print(f"Experiments: {len(experiments)}")
for exp in experiments:
    print(f"  - {exp.name}")
EOF
```

---

## Database Management

### Connect to PostgreSQL
```bash
docker compose exec postgres psql -U mlflow -d mlflow
```

### Common Queries
```sql
-- List experiments
SELECT id, name FROM experiments;

-- List runs
SELECT run_id, experiment_id, status FROM runs;

-- List metrics
SELECT run_id, key, value FROM metrics;

-- Export data
\copy (SELECT * FROM experiments) TO 'experiments.csv' WITH CSV HEADER;
```

### Backup Database
```bash
docker compose exec postgres pg_dump -U mlflow -d mlflow > backup.sql
```

### Restore Database
```bash
docker compose exec -T postgres psql -U mlflow -d mlflow < backup.sql
```

---

## Ports & URLs

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Frontend | 5173 | http://localhost:5173 | App |
| API | 8000 | http://localhost:8000/docs | Swagger Docs |
| MLflow | 5000 | http://localhost:5000 | Web UI |
| Garage S3 | 3900 | http://localhost:3900 | S3 API |
| Garage UI | 3000 | http://localhost:3000 | Console |
| PostgreSQL | 5432 | localhost:5432 | Database |

---

## Environment File (.env)

### View Current Values
```bash
cat .env
```

### Update Value
```bash
# Edit .env file manually
nano .env

# Then rebuild
docker compose down -v
docker compose up -d --build
```

### Generate New Secrets
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Troubleshooting Checklist

- [ ] All 6 services running? → `docker compose ps`
- [ ] Ports not in use? → `lsof -i :5173 :8000 :5000 :3000`
- [ ] Services healthy? → `docker compose logs -f`
- [ ] MLflow accessible? → `curl http://localhost:5000/`
- [ ] Backend health? → `curl http://localhost:8000/api/v1/health`
- [ ] Database working? → `docker compose exec postgres pg_isready`
- [ ] S3 access? → Check Garage UI at http://localhost:3000

---

## Common Issues & Solutions

### Port Already in Use
```bash
# Find what's using port 5173
lsof -i :5173

# Kill process (if needed)
kill -9 <PID>

# Or use different port (edit docker-compose.yml)
```

### Services Won't Start
```bash
# Check logs
docker compose logs -f

# Clear and restart
docker compose down -v
docker compose up -d --build
```

### MLflow Can't Connect to Garage
```bash
# Check S3 credentials
docker compose exec backend env | grep AWS

# Test S3 connection
docker compose exec backend python3 << 'EOF'
import boto3
s3 = boto3.client('s3', endpoint_url='http://garage:3900', ...)
print("Connected!")
EOF
```

### Database Locked
```bash
# Restart PostgreSQL
docker compose restart postgres
```

---

## Performance Tips

### Reduce Memory Usage
```bash
# Stop unnecessary services during development
docker compose stop mlflow  # Stop MLflow if not needed
docker compose stop garage  # Stop Garage if not needed
```

### Speed Up Builds
```bash
# Use build cache
docker compose up -d --build

# Don't rebuild if not needed
docker compose up -d
```

### Monitor in Real-time
```bash
# In one terminal
docker compose logs -f

# In another terminal
docker stats
```

---

## Useful One-Liners

```bash
# Restart everything
docker compose restart

# Clean up (stop & remove containers)
docker compose down

# Full reset (stop, remove containers, remove volumes)
docker compose down -v

# View recent errors
docker compose logs --tail=50 | grep -i error

# Check service uptime
docker compose ps --format "table {{.Names}}\t{{.Status}}"

# Backup MLflow database
docker compose exec postgres pg_dump -U mlflow mlflow | gzip > mlflow_backup_$(date +%s).sql.gz

# Copy file from container
docker compose cp backend:/app/artifacts/report.pdf ./report.pdf

# Copy file to container
docker compose cp ./config.yaml backend:/app/config.yaml
```

---

**Last Updated**: 2026-07-09  
**Status**: Production Ready ✅
