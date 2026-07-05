# Resume AI Platform

AI-powered resume screening & job matching platform. Upload resumes, extract text,
generate embeddings, train ranking models, serve predictions, and track everything
through a full MLOps loop.

---

## 📚 Platform Documentation

We have established dedicated documentation guides covering all aspects of development, operations, and ML workflows:

1. **[System Architecture](docs/architecture.md)**: Deep dive into microservices communication, database vector store design, security NetworkPolicies, and trace propagation flows.
2. **[Local Developer Setup](docs/local_setup.md)**: Boot the entire stack locally using Docker Compose and perform integration validation checks.
3. **[Kubernetes Deployment Guide](docs/deployment.md)**: Build and deploy containers using Helm charts, manage staging vs production environments with Kustomize overlays, and automate releases using GitOps with ArgoCD.
4. **[MLOps Operations Workflow](docs/mlops_workflow.md)**: Ingest online features using Feast store, track training runs in MLflow tracking server, compile Kubeflow pipelines, and route Knative canary releases on KServe.
5. **[Troubleshooting & Production Runbook](docs/troubleshooting.md)**: Steps to trace user requests end-to-end, filter structured JSON logs, and resolve database/queue bottlenecks.

---

## 🛠️ Production Operations Enabled

- **Security**: Authentication using JWT with role claims. Access control (RBAC) in Gateway and services. TLS configuration with cert-manager and secret injection using Vault agent sidecars.
- **Observability**: Structured logs in JSON format including trace, span, user, and request IDs. Distributed tracing using OpenTelemetry and Jaeger.
- **Alerting**: Alertmanager configurations routing to Slack, Email, and Teams with Prometheus alerting rules.
- **Backup**: Kubernetes CronJobs performing automated daily dumps of Postgres, MLflow, and mirror of S3 objects.
- **Autoscaling**: Automatic horizontal (HPA) and vertical (VPA) scaling on CPU, Memory, and queue depth.



