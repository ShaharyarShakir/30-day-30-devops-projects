# Multi-Chain Smart Contract Deployment Platform

Lets developers create projects, build & test smart contracts, deploy to multiple
blockchains (Ethereum, Solana — Polygon/Base/Arbitrum later), verify contracts,
monitor deployments, roll back, manage secrets, and view analytics.

## Architecture

```
                    React Frontend
                          │
                          ▼
                    NestJS API Gateway
                          │
      ┌───────────────────┼───────────────────┐
      ▼                   ▼                   ▼
 Authentication     Deployment API      Project API
                          │
                     PostgreSQL
                          │
                     RabbitMQ Queue
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
    Rust Build Worker              Rust Deploy Worker
          │                               │
          └───────────────┬───────────────┘
                          ▼
                  Blockchain Networks
             Ethereum / Solana / Base
```

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React, Vite, TanStack Router/Query, shadcn/ui, Tailwind CSS |
| API | NestJS (auth, users, projects, deployments) |
| Blockchain Service | Rust — compilation, wallet management, signing, deployment, verification |
| Worker Service | Rust — RabbitMQ consumer, long-running deploy jobs, event indexing |
| Data | PostgreSQL, RabbitMQ |
| Secrets | HashiCorp Vault |
| DevOps | Docker, Kubernetes, Helm, Kustomize, GitHub Actions, ArgoCD |
| Observability | Prometheus, Grafana, Loki, OpenTelemetry, Jaeger |

## Sprint Roadmap

- [x] **Sprint 1 — Foundation**: repo structure, Docker Compose (Postgres, RabbitMQ, Vault dev), DB schema
- [ ] **Sprint 2**: NestJS API — JWT + refresh token auth, GitHub OAuth, wallet linking, users/projects CRUD
- [ ] **Sprint 3**: Rust Build Worker — Solidity compilation (`solc`), Anchor/Solana program builds, consumes build queue
- [ ] **Sprint 4**: Rust Deploy Worker — `ethers-rs` for EVM chains, `solana-sdk` for Solana, tx signing via Vault-held keys
- [ ] **Sprint 5**: React frontend — project dashboard, deployment history, wallet management UI
- [ ] **Sprint 6**: Kubernetes + Helm + Kustomize manifests, Vault integration (replacing dev mode)
- [ ] **Sprint 7**: GitHub Actions → ArgoCD GitOps pipeline
- [ ] **Sprint 8**: Observability — Prometheus, Grafana, Loki, OpenTelemetry, Jaeger; dashboards for API latency, deployment duration, gas usage, queue length, worker health

## Sprint 1 — Quickstart

```bash
cd multichain-deploy-platform
make up
make status
```

| Service | URL | Credentials |
|---|---|---|
| PostgreSQL | localhost:5432 | postgres / postgres (db: `chaindeploy`) |
| RabbitMQ Management | http://localhost:15672 | guest / guest |
| Vault UI | http://localhost:8200 | root token: `root` |

Vault is running in **dev mode** — in-memory, auto-unsealed, root-token auth.
That's correct for local development only; Sprint 6 replaces it with a properly
initialized, unsealed, and policy-scoped Vault in Kubernetes.

## Database Schema

Seven tables, created automatically on first `make up` via
`infra/docker/postgres/01-schema.sql`:

- **users** — email/password or GitHub OAuth, refresh token hash
- **projects** — owned by a user, optionally linked to a GitHub repo
- **contracts** — belongs to a project; `chain_family` is `evm` or `solana`
- **wallets** — a user's signing wallets; the actual key lives in Vault, only
  the `vault_key_path` is stored in Postgres
- **deployments** — one per (contract, network) attempt; tracks status,
  verification status, and `previous_deployment_id` for rollback lineage
- **transactions** — on-chain tx records per deployment; `gas_used` (EVM) or
  `fee_lamports` (Solana) depending on `chain_family`
- **audit_logs** — generic action log (`deployment.created`, `wallet.linked`, etc.)

## Project Structure

```
multichain-deploy-platform/
├── frontend/                   # React + Vite (Sprint 5)
├── backend/
│   └── api/                    # NestJS (Sprint 2)
├── services/
│   ├── blockchain-service/     # Rust: compile, sign, deploy, verify (Sprint 3-4)
│   └── worker-service/         # Rust: queue consumer, event indexing (Sprint 3-4)
├── infra/
│   ├── docker/
│   │   └── postgres/01-schema.sql
│   ├── kubernetes/             # Sprint 6
│   ├── helm/                   # Sprint 6
│   └── kustomize/              # Sprint 6
├── docs/
├── scripts/
├── .github/workflows/          # Sprint 7
├── docker-compose.yml
├── Makefile
└── .env
```

## Next: Sprint 2

Sprint 2 builds the NestJS API's auth flow:

- JWT access tokens + refresh token rotation
- GitHub OAuth login
- Wallet linking (address + Vault key path, no raw keys ever touch Postgres)
- Users and Projects CRUD modules