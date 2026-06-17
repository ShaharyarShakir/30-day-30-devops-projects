# AI Kubernetes Troubleshooting Agent

An on-demand, intelligent Kubernetes troubleshooting dashboard. The agent collects evidence (pods, logs, events, deployments, networking) from a target Kubernetes cluster, runs AI reasoning using OpenRouter, diagnoses the root cause, and provides copy-paste ready fixes.

## Architecture

The system operates end-to-end as follows:

```text
Frontend (Next.js)
        ↓  (REST API with cluster selection query param)
FastAPI Backend (Orchestrator)
        ↓  (Queries target context using kubectl executor)
Kubernetes Evidence Collector (Pods, Logs, Events, Deployments, Network)
        ↓
AI reasoning agent (LLM via OpenRouter)
        ↓
Root Cause + Suggested Actionable Fix
        ↓
InsForge Integration (DB history saving + Realtime checklist updates)
        ↓
Frontend Dashboard Rendering (Premium Healthy Alert or Unhealthy Diagnosis Card)
```

## Project Structure

```text
├── backend/          # FastAPI backend orchestrator & Kubernetes inspectors
│   ├── ai/           # LLM Prompt builders and OpenRouter reasoning clients
│   ├── api/          # FastAPI routers (health, clusters list, investigate)
│   ├── core/         # Logging & environment settings
│   ├── kubernetes/   # kubectl exec wrappers (pods, logs, events, deployments, network)
│   ├── services/     # Investigation orchestration logic
│   └── test_integration.py # Automated end-to-end integration test
├── frontend/         # Next.js UI dashboard
│   ├── app/          # Pages and layouts (Geist fonts, globals.css, dashboard layout)
│   ├── components/   # UI components (stepper check-list, system status, button)
│   ├── hooks/        # React Query custom hooks
│   └── services/     # InsForge SDK client initialization
├── tests/
│   └── scenarios/    # Standard Kubernetes failure manifests (CrashLoop, OOM, Selector Mismatch)
└── docker-compose.yml
```

## Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- A running Kubernetes cluster (e.g. colima, minikube, or kind) configured in your local `~/.kube/config`.

### 2. Configure Environment Variables

Create `backend/.env`:
```ini
OPENROUTER_API_KEY=sk-or-v1-...  # Your OpenRouter API key
OPENROUTER_MODEL=google/gemini-2.5-flash  # LLM model to use
KUBECONFIG_PATH=                  # Optional: path to specific kubeconfig
INSFORGE_API_KEY=ik_...          # Your InsForge project API key
INSFORGE_API_BASE_URL=https://...insforge.app
```

Create `frontend/.env.local`:
```ini
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_INSFORGE_BASE_URL=https://...insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Build and Start Services

```bash
# In the root directory
docker compose up --build
```

Access the applications:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## API Endpoints

### 1. Health
- **`GET /health`**: Returns backend service health status.

### 2. Cluster Contexts
- **`GET /clusters`**: Fetches all available Kubernetes contexts defined in the local `kubeconfig` using `kubectl config view -o json` and returns the active current context.

### 3. Investigation
- **`POST /investigate?cluster=<context_name>`**: Triggers cluster diagnostics. Accepts an optional `cluster` query parameter to target a specific context.
  - Intercepts cluster unreachable or configuration issues and returns clean, actionable instructions.
  - Bypasses the LLM call and returns a "Cluster is Healthy" state if no unhealthy resources are found.
  - Saves the investigation output to the InsForge database and pushes progress updates via InsForge Realtime.

---

## Testing Kubernetes Failure Scenarios

We have created four manifests under [tests/scenarios](file:///home/shaharyar/01__git_repos/30-day-30-devops-projects/04__day/tests/scenarios/) to validate the troubleshooting capabilities of the AI Agent:

### 1. Scenario 1 — CrashLoopBackOff (`crashloop.yaml`)
- **Issue**: A deployment that fails to start because of a missing env variable (`MISSING_ENV`).
- **Apply**: `kubectl apply -f tests/scenarios/crashloop.yaml`
- **Verification**: Run the AI investigation. The agent will read container stderr logs (`Error: MISSING_ENV environment variable is not defined!`), detect the CrashLoopBackOff state, and suggest adding the missing secret or env variable.

### 2. Scenario 2 — ImagePullBackOff (`bad-image.yaml`)
- **Issue**: A container utilizing a wrong image tag (`nginx:nonexistent-tag-12345`).
- **Apply**: `kubectl apply -f tests/scenarios/bad-image.yaml`
- **Verification**: Run investigation. The agent will read the pod status and K8s Events (`Back-off pulling image`), identify the invalid tag, and suggest setting a valid image version.

### 3. Scenario 3 — OOMKilled (`oomkill.yaml`)
- **Issue**: A Python process allocating memory excessively inside a container with low memory limits (`15Mi`).
- **Apply**: `kubectl apply -f tests/scenarios/oomkill.yaml`
- **Verification**: Run investigation. The agent will detect the `OOMKilled` status from pod history and recommend increasing the memory requests/limits.

### 4. Scenario 4 — Service Selector Mismatch (`selector-mismatch.yaml`)
- **Issue**: A service that routes traffic to selector `app: selector-app`, but the deployment pods are labeled `app: selector-app-pod`.
- **Apply**: `kubectl apply -f tests/scenarios/selector-mismatch.yaml`
- **Verification**: Run investigation. The agent will cross-reference the service selector with active pod labels, identify the mismatch, and recommend matching selectors.

**Cleanup**:
To delete the test resources, run:
```bash
kubectl delete -f tests/scenarios/crashloop.yaml
kubectl delete -f tests/scenarios/bad-image.yaml
kubectl delete -f tests/scenarios/oomkill.yaml
kubectl delete -f tests/scenarios/selector-mismatch.yaml
```
