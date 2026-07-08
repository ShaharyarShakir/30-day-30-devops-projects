# Nomad AI

A full-stack AI application built with a monorepo architecture using Turborepo, featuring a REST API and mobile application.

## Project Overview

Nomad AI is a modern application consisting of:

- **API**: Node.js/TypeScript backend service
- **Mobile**: React Native/Expo mobile application
- **Infrastructure**: Docker Compose setup with MongoDB, Redis, and Garage (S3-compatible storage)

## Tech Stack

### Backend
- Node.js with TypeScript
- MongoDB for data persistence
- Redis for caching
- Garage for S3-compatible object storage

### Mobile
- React Native with Expo
- TypeScript
- TailwindCSS for styling

### DevOps
- Turborepo for monorepo management
- Docker Compose for local development
- Kubernetes manifests for production deployment
- GitHub Actions for CI/CD

## Getting Started

### Prerequisites
- Node.js >= 18
- pnpm >= 9.0.0
- Docker and Docker Compose

### Installation

1. Clone the repository and navigate to the project:
```bash
cd nomad-ai
```

2. Install dependencies:
```bash
pnpm install
```

3. Start infrastructure services:
```bash
docker-compose up -d
```

4. Copy environment variables:
```bash
cp .env.example .env
```

5. Run development servers:
```bash
pnpm dev
```

### Development

To develop all apps and packages:
```bash
pnpm dev
```

To develop specific apps:
```bash
# API only
pnpm dev --filter=api

# Mobile only
pnpm dev --filter=mobile
```

### Build

To build all apps and packages:
```bash
pnpm build
```

To build specific apps:
```bash
pnpm build --filter=api
pnpm build --filter=mobile
```

## Infrastructure Services

The project uses Docker Compose to run the following services:

- **MongoDB**: Port 27017 - Primary database
- **Redis**: Port 6379 - Caching layer
- **Garage**: Ports 3900 (S3 API), 3903 (Admin API) - S3-compatible object storage
- **Garage WebUI**: Port 3909 - Web interface for Garage management

## Project Structure

```
nomad-ai/
├── apps/
│   ├── api/          # Backend API service
│   └── mobile/       # React Native mobile app
├── infra/
│   ├── docker/       # Docker configurations
│   ├── github/       # GitHub Actions workflows
│   └── kubernetes/   # K8s manifests
├── packages/         # Shared packages
└── docker-compose.yml
```

## Useful Commands

- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm check-types` - Type check all packages

## License

MIT