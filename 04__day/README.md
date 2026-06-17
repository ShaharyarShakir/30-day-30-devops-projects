# AI Kubernetes Troubleshooting Agent

On-demand Kubernetes troubleshooting powered by AI.

## Architecture

```text
Frontend → FastAPI Backend → Kubernetes Investigation → AI Agent → LLM → Diagnosis
```

## Project Structure

```text
├── backend/          # FastAPI orchestrator
├── frontend/         # Next.js UI
├── docs/             # Documentation
├── prompts/          # AI prompt templates
└── docker-compose.yml
```

## Quick Start

### With Docker (recommended)

```bash
docker compose up --build
```

Access:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/health

### Local Development

**Backend**

```bash
cd backend
cp .env.example .env
uv pip install -e .
uvicorn main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key (future) |
| `OPENROUTER_MODEL` | LLM model name (future) |
| `KUBECONFIG_PATH` | Path to kubeconfig (future) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL (default: `http://localhost:8000`) |

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health check |

## InsForge MCP Setup

This project uses InsForge for backend features like authentication, storage, and realtime updates. To set up InsForge MCP:

1. **Create an InsForge Project**:
   - Visit [insforge.dev](https://insforge.dev)
   - Create a new project and get your API key

2. **Configure MCP**:
   - Copy `.mcp.example.json` to `.mcp.json`
   - Replace `your-insforge-api-key-here` with your InsForge API key
   - Set `API_BASE_URL` to your InsForge instance URL (default: `http://localhost:7130`)

3. **Install InsForge MCP**:
   - For Trae:
     ```bash
     npx @insforge/install --client trae --env API_KEY=your_api_key --env API_BASE_URL=http://localhost:7130
     ```
   - For Cursor, Claude Code, Windsurf, etc., see [InsForge MCP docs](https://docs.insforge.dev/mcp-setup)

4. **Verify Connection**:
   - Ask the agent: "I'm using InsForge as my backend platform, call InsForge MCP's fetch-docs tool to learn about InsForge instructions"

## Status

Foundation setup complete. Kubernetes investigation and AI reasoning are not yet implemented.
