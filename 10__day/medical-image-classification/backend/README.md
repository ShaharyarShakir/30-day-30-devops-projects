# Medical Image Classification - Backend Service

This is the backend API service for the Medical Image Classification platform, built with FastAPI and Python 3.11. It exposes endpoints for model predictions, health status, and integrates with MLflow and S3-compatible storage (Garage) for model lifecycle management.

## 🚀 Technologies Used

* **FastAPI**: High-performance web framework for building APIs.
* **Uvicorn / Gunicorn**: Production ASGI server setup.
* **uv**: Blazing fast Python package installer and resolver.
* **TensorFlow / Keras**: Machine learning framework for serving the DenseNet121 classification model.
* **MLflow**: MLOps platform for tracking experiments and managing model registry.
* **Boto3**: S3 client to interact with the Garage object store.
* **PostgreSQL**: Relational database for metadata tracking.

---

## 🛠️ Docker Optimizations

The backend `Dockerfile` is highly optimized for performance, image size, and security:
* **Multi-Stage Build**:
  * **Builder Stage**: Installs the build toolchain (`build-essential`) and installs all project dependencies into `/app/.venv` using `uv` with cache mounts for fast compilation.
  * **Runner Stage**: A minimal production stage starting from `python:3.11-slim` that copies *only* the compiled virtual environment and code files. This excludes compilers and headers, decreasing image size and reducing security vulnerabilities.
* **No `curl` Dependency**: The container health check uses Python's built-in `urllib.request` library, removing the need to install external packages like `curl` in the runner stage.
* **Automatic Directories**: Automatically creates the `/app/artifacts` directory at build time to prevent FastAPI static mount crashes.

---

## 💻 Local Development

### Prerequisites
* Python 3.11+
* [uv](https://github.com/astral-sh/uv) package manager installed

### Installation & Setup

1. **Install dependencies**:
   ```bash
   uv sync
   ```

2. **Run the server in development mode**:
   ```bash
   uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

3. **Run tests**:
   ```bash
   uv run pytest
   ```

The API will be interactive at `http://127.0.0.1:8000/docs`.

---

## 🐳 Docker Deployment

To build the optimized backend container individually:

```bash
docker build -t medical-image-classification-backend .
```

To run the container (needs MLflow, Postgres, and Garage running):

```bash
docker run -p 8000:8000 medical-image-classification-backend
```
