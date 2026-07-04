# HashiCorp Vault Integration Guide

This guide details the step-by-step instructions to configure HashiCorp Vault on a Kubernetes cluster, enable Kubernetes authentication, create secrets, and authorise the backend ServiceAccount to dynamically read secrets using the Vault Agent Sidecar Injector.

---

## 1. Install Vault Server
Install HashiCorp Vault on your Kubernetes cluster using Helm:

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Install Vault with the Vault Agent Injector enabled
helm install vault hashicorp/vault \
    --namespace vault \
    --create-namespace
```

---

## 2. Enable Kubernetes Authentication
Execute a shell inside the Vault server pod (`vault-0`) to configure Kubernetes authentication:

```bash
# Open an interactive shell inside the vault pod
kubectl exec -it vault-0 -n vault -- sh
```

Run the following commands inside the pod shell:

```sh
# Enable Kubernetes authentication method
vault auth enable kubernetes

# Configure Vault to communicate with the local Kubernetes API server
vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc"
```

---

## 3. Create the Database Secret in Vault
Store the DB configuration credentials in the KV (Key-Value) store:

```sh
# Put secret under path 'secret/url-shortener'
vault kv put secret/url-shortener \
    DB_USER="postgres" \
    DB_PASSWORD="super-secret-password" \
    DB_NAME="url_shortener"
```

---

## 4. Define and Create Read Policy
To restrict access so that the backend application can only read this specific secret, define a read-only policy.

Create a policy file called `policy.hcl` inside the container or write it on the fly:

```sh
# Write the policy definition
cat <<EOF > policy.hcl
path "secret/data/url-shortener" {
  capabilities = ["read"]
}
EOF

# Register the policy in Vault
vault policy write url-shortener policy.hcl
```

---

## 5. Create Kubernetes Auth Role in Vault
Bind the Vault policy to the backend's Kubernetes ServiceAccount name and namespace:

```sh
vault write auth/kubernetes/role/url-shortener \
    bound_service_account_names=backend \
    bound_service_account_namespaces=url-shortener \
    policies=url-shortener \
    ttl=24h
```

Now you can exit the Vault shell.

---

## 6. Apply Kubernetes Manifests
Deploy the backend ServiceAccount and the updated backend deployment:

```bash
# Create namespace if not exists
kubectl apply -f k8s/namespace.yaml

# Apply the backend ServiceAccount
kubectl apply -f k8s/backend/serviceaccount.yaml

# Deploy the backend (which includes Vault sidecar annotations)
kubectl apply -f k8s/backend/deployment.yaml
```

The Vault Agent Injector will detect the annotations on the pod template, start a sidecar container to fetch the credentials, and mount them as a file in the main app container at `/vault/secrets/config`.
