# ChainDeploy Deployment Guide

This document describes how to deploy the platform onto Kubernetes using Helm, Kustomize, and GitOps.

## Pre-requisites
- Kubernetes Cluster
- Ingress Nginx Controller
- HashiCorp Vault Server
- Argo CD Controller

## Deploying via Argo CD
1. Point your Argo CD root application to [root-application.yaml](file:///home/shaharyar/01__git_repos/30-day-30-devops-projects/08__day/gitops/bootstrap/root-application.yaml):
   ```bash
   kubectl apply -f gitops/bootstrap/root-application.yaml
   ```
2. Argo CD will automatically sync:
   - Platform infrastructure (Vault, Postgres, Redis, Observability) under `chaindeploy-infra` namespace.
   - Applications (API, Frontend, Workers) under `chaindeploy-apps` namespace.

## Progressive Delivery
We use **Argo Rollouts** for zero-downtime releases. The API rollout manifest is located at `gitops/applications/overlays/prod/rollout.yaml`.
- Canary steps: 10% traffic (5m pause), 50% traffic (10m pause), then full promotion.
