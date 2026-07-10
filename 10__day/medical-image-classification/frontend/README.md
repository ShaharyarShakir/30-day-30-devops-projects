# Medical Image Classification - Frontend UI

This is the web-based frontend interface for the Medical Image Classification platform, built with React, TypeScript, and Vite. It provides an intuitive interface for uploading chest X-rays, making real-time classification predictions, and viewing diagnostics.

## 🚀 Technologies Used

* **React**: User interface library.
* **TypeScript**: Static typing for Javascript.
* **Vite**: High-performance dev server and compiler.
* **Bun**: Blazing fast package manager and runtime.
* **Tailwind CSS & Shadcn UI**: Sleek, modern styling and components.
* **Nginx**: Lightweight web server to host static assets in production.

---

## 🛠️ Docker Optimizations

The frontend `Dockerfile` has been optimized for size, performance, and log cleanliness:
* **Multi-Stage Build**:
  * **Builder Stage**: Uses a lightweight `oven/bun:1-alpine` image to install dependencies and build production static files. It utilizes Docker's cache mount (`--mount=type=cache`) to store Bun dependency caches, speeding up incremental builds.
  * **Production Stage**: Uses a pinned `nginx:1.27-alpine` base image to host static files from the builder, ensuring reproducible builds.
* **Clean Health Check**:
  * The container health check hits the `/health` endpoint instead of downloading the entire `index.html` file.
  * In the Nginx config, the `/health` route is configured with `access_log off;` to prevent health check queries from polluting the Nginx access logs.
  * The health check URL uses `http://127.0.0.1/health` instead of `http://localhost/health` to resolve a known alpine loopback issue where IPv6 is prioritized but not bound, avoiding "connection refused" errors.

---

## 💻 Local Development

### Prerequisites
* [Bun](https://bun.sh/) package manager installed

### Installation & Setup

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Start the development server**:
   ```bash
   bun run dev
   ```

The app will be accessible locally at `http://localhost:5173`.

---

## 🐳 Docker Deployment

To build the frontend container locally:

```bash
docker build -t medical-image-classification-frontend .
```

To run the container (exposed on host port 80 or any mapping):

```bash
docker run -p 5173:80 medical-image-classification-frontend
```
