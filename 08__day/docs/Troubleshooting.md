# Troubleshooting Guide

Standard steps to diagnose and repair errors in the ChainDeploy platform.

## Distributed Tracing with Jaeger
If a contract deployment fails, trace the request end-to-end:
1. Open Jaeger UI at `http://localhost:16686`.
2. Search by `serviceName=chaindeploy-api` or filter by `deployment_id` tag.
3. Inspect downstream spans (`redis`, `builder`, `deployer`) to find the exact operation that failed.

## Analyzing Centralized Logs (Loki)
Query container logs inside Grafana (port 3004):
- Query: `{container="chaindeploy-api"} |= "error"`
- Query: `{container="chaindeploy-builder"} |= "compile"`

## Common Issues
### Vault is Sealed
- **Symptoms**: API or deployer failing to start up or authenticate.
- **Fix**: Connect to Vault server and run `vault operator unseal` using unseal keys.
