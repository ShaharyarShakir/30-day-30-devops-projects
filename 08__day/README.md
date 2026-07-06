# ChainDeploy: Enterprise Web3 DevOps & Platform Engineering

ChainDeploy is a multi-tenant Web3 smart contract deployment and DevOps platform. It provides enterprise-grade GitOps delivery pipelines, secure key management via HashiCorp Vault, multi-chain smart contract compilation, transaction signing, real-time index auditing, and centralized telemetry dashboards.

---

## Final Architecture

```text
                    Developers
                         │
                         ▼
                  React Dashboard
                         │
                   API Gateway (NestJS)
                         │
      ┌──────────────────┼──────────────────┐
      ▼                  ▼                  ▼
 Authentication      Organizations     API Keys
      │                  │                  │
      └──────────────┬───┴──────────────────┘
                     ▼
                Deployment API
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
 Builder Worker  Deployer Worker Event Indexer
 (Rust)          (Rust)          (Rust)
        │            │            │
        └────────────┼────────────┘
                     ▼
      Multi-Chain Networks (EVM, Solana)
                     │
                     ▼
 PostgreSQL • Redis • Vault • Object Storage (Floci S3)
                     │
                     ▼
 Prometheus • Grafana • Loki • Jaeger (Telemetry)
```

---

## Directory Structure

```text
chaindeploy/
├── apps/
│   ├── frontend/               # React + Vite Client Dashboard
│   └── api/                    # NestJS API Gateway (RBAC, API Keys, Audit Logs)
├── services/
│   ├── builder/                # Rust: solidity & rust program compiler worker
│   ├── deployer/               # Rust: transaction signer & chain deployer worker
│   └── indexer/                # Rust: blockchain log filter & real-time auditor
├── gitops/
│   ├── bootstrap/              # ArgoCD App-of-Apps bootstrap manifests
│   ├── clusters/               # Dev/Prod target environments mappings
│   ├── applications/
│   │   ├── charts/             # Service templates (deployment, service, HPA, Ingress)
│   │   └── overlays/           # Kustomize environment values (Dev, Staging, Prod)
│   └── infrastructure/         # Shared services (Postgres, Redis, OTel, Loki)
├── infra/
│   ├── docker/                 # Service-specific configs (Prometheus, Loki, Grafana)
│   ├── terraform/              # Infrastructure provisioning (VPC, EKS, RDS, Cache)
│   ├── ansible/                # Node orchestration configuration playbooks
│   ├── vault/                  # Secret initialization and engine setup scripts
│   ├── backup/                 # Disaster recovery backup and restore tools
│   └── opa/                    # Open Policy Agent Admission rego guidelines
└── docs/                       # Runbooks, Security specs, and API docs
```

---

## How to Run the Project (Local Integration)

We use **Docker Compose** alongside **Floci** (a fast, lightweight cloud emulator replacement for LocalStack) to orchestrate the entire platform topology locally.

### 1. Boot the Stack
Run the following command at the root of the project:
```bash
docker compose up -d
```

This starts:
- **Frontend App**: [http://localhost](http://localhost) (port 80)
- **API Gateway**: [http://localhost:3000](http://localhost:3000)
- **Rust Workers**: Listening on ports 3001 (builder), 3002 (deployer), and 3003 (indexer)
- **Vault UI**: [http://localhost:8200](http://localhost:8200) (Token: `root`)
- **Grafana Dashboards**: [http://localhost:3004](http://localhost:3004) (User: `admin` / Password: `admin`)
- **Jaeger UI (Tracing)**: [http://localhost:16686](http://localhost:16686)
- **Loki Server**: [http://localhost:3100](http://localhost:3100)
- **Floci AWS/GCP Emulator**: [http://localhost:4566](http://localhost:4566)

### 2. Initialize Secrets Engine (Vault)
Setup keys, policies, and database pointers in Vault:
```bash
docker exec -it chaindeploy-vault /bin/sh -c "/vault/file/vault-init.sh"
# Or run locally if Vault CLI is installed:
./infra/vault/vault-init.sh
```

---

## How to Test the Project

### 1. Health Checks Verification
Verify the components are online and healthy:
```bash
# NestJS API Health
curl http://localhost:3000/health

# Rust Builder Health
curl http://localhost:3001/health

# Rust Deployer Health
curl http://localhost:3002/health

# Rust Indexer Health
curl http://localhost:3003/health
```

### 2. Run Test Suites
Execute linting and unit/integration tests:

**For Node services (API/Frontend)**:
```bash
pnpm install
pnpm test
```

**For Rust Workers**:
```bash
cd services
cargo test
```

### 3. Disaster Recovery Validation
Test database and secrets recovery routines:
```bash
# Create a timestamped compressed backup package
./infra/backup/backup.sh

# Restore from a backup archive package
./infra/backup/restore.sh /var/backups/chaindeploy/backup-archive-name.tar.gz
```

---

## Kubernetes & Continuous GitOps Delivery

To deploy the production-grade manifests onto your target cluster:
1. Direct your Argo CD controller to the bootstrap app-of-apps pattern:
   ```bash
   kubectl apply -f gitops/bootstrap/root-application.yaml
   ```
2. Argo CD will continuously sync the platform configurations across namespaces matching the [ApplicationSet spec](file:///home/shaharyar/01__git_repos/30-day-30-devops-projects/08__day/gitops/bootstrap/applicationset.yaml).