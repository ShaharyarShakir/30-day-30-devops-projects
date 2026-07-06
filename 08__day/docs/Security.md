# ChainDeploy Platform Security

Security governance, secrets tracking, and admission policy parameters.

## Secrets Management
- Application credentials (database, JWT salts, blockchain private keys) are stored securely inside **HashiCorp Vault**.
- In Kubernetes, we use **Vault sidecar agent injection** to mount secrets dynamically in memory (`/vault/secrets/secrets`), avoiding storing plain-text keys in environment variables or container images.

## Supply Chain Integrity
- All container images pushed to GHCR are signed using **Cosign keyless OIDC authentication** in the CI pipeline.
- We generate a Software Bill of Materials (SBOM) for each release.

## OPA Policies
Kubernetes deployments must pass the OPA admission policy ([policy.rego](file:///home/shaharyar/01__git_repos/30-day-30-devops-projects/08__day/infra/opa/policy.rego)):
- No privileged execution.
- Images must only be sourced from approved `ghcr.io/shaharyarshakir/*` registries.
- Explicit resource requests/limits are mandatory.
