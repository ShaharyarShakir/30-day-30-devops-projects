# Deployment Guide

This document describes how to deploy the **Resume AI Platform** into Kubernetes using Helm, Kustomize overlays, and GitOps with ArgoCD.

## 1. Prerequisites
- Kubernetes Cluster (v1.26+)
- `kubectl` CLI configured
- `helm` v3 installed
- `kustomize` CLI installed

---

## 2. Helm Deployment (Inference Service)

We provide a Helm chart for deploying KServe InferenceServices under `/helm/resume-inference`.

### Deploy Chart
1. Move to the helm directory:
   ```bash
   cd helm/resume-inference
   ```
2. Configure settings in `values.yaml` (e.g. storageUri, access keys).
3. Install the chart using Helm:
   ```bash
   helm install candidate-ranker . -n ml-serving --create-namespace
   ```

---

## 3. Kustomize Overlays (Staging vs Production)

We use Kustomize to manage environment-specific configurations under `/kustomize`.

### Directory Layout
- `kustomize/base/`: Contains base InferenceService and namespace resources.
- `kustomize/overlays/staging/`: Staging configurations (scales to 0 for cost saving).
- `kustomize/overlays/production/`: Production configurations (minimum scale of 1 replica to avoid cold starts, higher resource requests).

### Apply Environments
- **Deploy Staging**:
  ```bash
  kubectl apply -k kustomize/overlays/staging
  ```
- **Deploy Production**:
  ```bash
  kubectl apply -k kustomize/overlays/production
  ```

---

## 4. GitOps with ArgoCD

ArgoCD automates the synchronization of Kubernetes states with Git repository declarations.

### Register Application
We configure ArgoCD with the Application manifest located at `infra/kubernetes/argocd/argocd-app.yaml`.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: resume-inference
  namespace: argocd
spec:
  project: default
  source:
    repoURL: "https://github.com/ShaharyarShakir/30-day-30-devops-projects.git"
    targetRevision: HEAD
    path: 07__day/kustomize/overlays/production
  destination:
    server: "https://kubernetes.default.svc"
    namespace: ml-serving
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Apply this manifest inside the ArgoCD namespace to initiate automated Git sync:
```bash
kubectl apply -f infra/kubernetes/argocd/argocd-app.yaml
```
ArgoCD will continuously poll the repository, updating deployment configurations dynamically upon new commits.
