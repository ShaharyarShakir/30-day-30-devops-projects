#!/bin/sh
set -e

# Vault CLI initialization script for ChainDeploy platform
echo "[VAULT] Waiting for Vault to be ready..."
until vault status > /dev/null 2>&1; do
  echo "[VAULT] Vault is not reachable. Retrying in 2s..."
  sleep 2
done

# Enable KV v2 secret engine if not enabled
if ! vault secrets list | grep -q "^secret/"; then
  echo "[VAULT] Enabling KV-V2 secret engine at secret/"
  vault secrets enable -path=secret kv-v2
else
  echo "[VAULT] KV-V2 secret engine already enabled at secret/"
fi

# Write application secrets
echo "[VAULT] Writing application secrets..."
vault kv put secret/chaindeploy \
  JWT_SECRET="prod-jwt-secret-key-32-chars-long-chaindeploy" \
  JWT_REFRESH_SECRET="prod-jwt-refresh-secret-key-long-chaindeploy" \
  DATABASE_PASSWORD="postgres-prod-secure-password" \
  REDIS_PASSWORD="redis-prod-secure-password" \
  GITHUB_OAUTH_CLIENT_ID="prod-github-client-id" \
  GITHUB_OAUTH_CLIENT_SECRET="prod-github-client-secret" \
  ETHEREUM_WALLET_PRIVATE_KEY="0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" \
  SOLANA_WALLET_PRIVATE_KEY="mock-solana-keypair-base58-encoded-string-chaindeploy" \
  ETH_RPC_URL="https://mainnet.infura.io/v3/mock-project-id" \
  SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Enable Kubernetes Auth method
if ! vault auth list | grep -q "^kubernetes/"; then
  echo "[VAULT] Enabling Kubernetes authentication..."
  vault auth enable kubernetes
else
  echo "[VAULT] Kubernetes authentication already enabled."
fi

# Configure Kubernetes auth engine to talk back to local K8s API
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc.cluster.local:443"

# Create a read-only policy for ChainDeploy app
echo "[VAULT] Creating read policy for ChainDeploy secrets..."
vault policy write chaindeploy-policy - <<EOF
path "secret/data/chaindeploy" {
  capabilities = ["read"]
}
EOF

# Create Kubernetes auth role
echo "[VAULT] Binding policy to Kubernetes service account role..."
vault write auth/kubernetes/role/chaindeploy-role \
  bound_service_account_names="*" \
  bound_service_account_namespaces="*" \
  policies=chaindeploy-policy \
  ttl=1h

echo "[VAULT] Vault successfully initialized and configured!"
