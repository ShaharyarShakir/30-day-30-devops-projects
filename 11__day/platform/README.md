# Platform Monorepo

Welcome to the central monorepo for the platform. This repository contains all microservices, apps, packages, and infrastructure configurations.

## Repository Structure

- **`apps/`**: Client-facing applications.
  - `frontend/`: Web interface powered by TanStack Start and Tailwind CSS.
- **`services/`**: Core platform backend services.
  - `gateway/`: NestJS API Gateway providing reverse proxying, rate limiting, and structured logging.
  - `auth/`: Kotlin Spring Boot service managing user authentication and sessions.
- **`packages/`**: Shared configurations, DTO contracts, and schemas.
  - `contracts/`: Shared OpenAPI specifications and DTO schemas.
  - `events/`: Kafka message/event schemas (e.g. `user.created`).
  - `shared-*/`: Reusable client/utility libraries per language.
- **`infrastructure/`**: Deployment and operations.
  - `compose/`: Local orchestration resources.
  - `kubernetes/`: Production orchestration manifests (future milestones).
  - `terraform/`: Infrastructure provisioning configurations (future milestones).
  - `helm/`: Kubernetes package charts (future milestones).

## Quick Start

### Prerequisites

Ensure you have the following installed locally:

- Node.js (>= 22) & npm
- JDK (>= 21)
- Go (>= 1.22)
- Python (>= 3.10)
- Docker & Docker Compose
- GNU Make

### Launching the Platform

To start all databases, message queues, and application servers:

```bash
make up
```

This will run all infrastructure services in the background and start the frontend, gateway, and auth service containers.

### Other Useful Commands

- Stop all services: `make down`
- View application logs: `make logs`
- Lint codebases: `make lint`
- Autoformat codebases: `make format`
- Run test suites: `make test`
- Reset workspace: `make clean`
