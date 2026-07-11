# Deployment Strategy

This document outlines deployment architectures for both local development and production.

## Local Development (Docker Compose)

The stack is orchestrated using `docker-compose.yml` located in `infrastructure/compose/`.

### Launching:

```bash
make up
```

### Stopping:

```bash
make down
```

## Production Deployment (Future Roadmap)

- **Container Registry**: Docker images will be built and pushed to GitHub Container Registry (GHCR) or AWS ECR.
- **Orchestration**: Kubernetes cluster deployment with configuration managed using **Helm charts** located in `infrastructure/helm/`.
- **Infrastructure as Code**: Production environments provisioned via Terraform configs in `infrastructure/terraform/`.
- **CI/CD**: GitHub Actions workflows in `.github/workflows/` handling continuous integration and automated staging/production deployments.
