# ChainDeploy Platform Architecture

This document describes the design, component interaction, and multi-tenant SaaS lifecycle of the ChainDeploy Platform.

## System Design Overview

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

## Component Breakdown

1. **API Gateway (NestJS)**: Receives client requests, processes tenant authentication, checks RBAC policies, registers API keys, and routes smart contract builds to Redis BullMQ.
2. **Builder (Rust)**: Pulls jobs from `build.queue:wait`, compiles contract packages, and writes build output details to Postgres and S3.
3. **Deployer (Rust)**: Pulls compilation details, requests wallets from HashiCorp Vault, signs transactions, broadcasts to networks, and registers logs.
4. **Indexer (Rust)**: Inspects transaction hashes, parses EVM event structures and Solana instructions, and logs audit registries.
5. **Observability Stack**: Prometheus (metrics), Loki (log management), Jaeger (distributed tracing), and Grafana (dashboards).
