# Local Development Instructions

Follow these steps to run the ChainDeploy SaaS stack on your local machine.

## Prerequisites
- Docker & Docker Compose
- pnpm (Node 20+)
- Rust (Cargo)

## Running the Complete Stack
1. Start the Docker Compose topology:
   ```bash
   docker compose up -d --build
   ```
2. This boots:
   - Frontend: `http://localhost` (port 80)
   - API: `http://localhost:3000`
   - Grafana: `http://localhost:3004` (Password: `admin`)
   - Jaeger UI: `http://localhost:16686`

## Local Cloud Mocks (Floci)
We use **Floci** for cloud environment emulation (port 4566):
- Emulates AWS S3 for saving compiled smart contract artifacts.
- Target endpoints: `http://localhost:4566`
- AWS profiles are mapped internally; no real AWS accounts are required.
