# ChainDeploy REST API Reference

The ChainDeploy REST API is authenticated via JWT tokens or programmatic API keys using the `x-api-key` header.

## Authentication

### API Keys
Include `x-api-key: <key>` and `x-organization-id: <org-uuid>` in request headers:
- Header key: `x-api-key`
- Prefix: `cd_`

---

## Endpoints

### 1. API Keys Management
* **POST `/api-keys`**: Create a scoped API key.
  - Headers: `x-organization-id`
  - Body: `{ "name": "CI Key", "scopes": ["deploy"], "expiresDays": 30 }`
* **GET `/api-keys`**: List active API keys.
* **DELETE `/api-keys/:id`**: Revoke an API key.

### 2. Projects & Contracts
* **POST `/projects`**: Create a new multi-chain project.
* **POST `/contracts`**: Register smart contracts.

### 3. Deployments
* **POST `/deployments`**: Initiate a compilation and deployment job.
  - Body: `{ "contractId": "<uuid>", "network": "devnet" }`
* **GET `/deployments`**: List all deployment jobs for tenant.
