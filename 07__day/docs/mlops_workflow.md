# MLOps Workflow Guide

This document describes the Machine Learning operations loop, covering model training, experiment tracking via MLflow, feature storage, Feast store integration, and deployment with KServe.

---

## 1. Feature Store (Feast)

We utilize **Feast** to manage offline and online features for resume parsing and candidate matching scores.
- **Offline Store**: PostgreSQL database used to ingest parsing metadata and train models.
- **Online Store**: Redis cache used to fetch low-latency feature vectors for live ranking scoring.

### Fetch features
Downstream services query the online store using:
```python
from feast import FeatureStore
store = FeatureStore(repo_path="ml/feature-store")
features = store.get_online_features(
    features=["candidate_features:experience_years", "candidate_features:skills_match"],
    entity_rows=[{"candidate_id": 100}]
).to_dict()
```

---

## 2. Model Training & Experiment Tracking (MLflow)

All training trials are versioned and logged within **MLflow**.
- **Model artifacts**: Stored in the Garage S3 endpoint (`s3://models/`).
- **Metadata metrics**: Saved to the MLflow tracking DB on Postgres.

### Run Training
Execute the local training execution script:
```bash
python ml/training/train.py
```
This registers parameters, metrics (accuracy, recall), and serializes the best pickle model directly to MLflow.

---

## 3. Kubeflow Pipelines

We compile the workflow into a reproducible pipeline YAML file `ml/pipelines/pipeline.yaml`.

```bash
# Compilation script
python ml/pipelines/pipeline.py
```

### Steps in the Pipeline:
1. **Preprocess**: Cleans raw dataset and syncs via DVC.
2. **Train**: Extracts features from Feast, trains model, and evaluates metrics.
3. **Register**: Conditionally registers the model to MLflow if precision limits are exceeded.
4. **Deploy**: Triggers Knative/KServe InferenceService upgrade.

---

## 4. Knative Canary Deployments

We implement canary routing using KServe annotations.
See `helm/resume-inference/values.yaml` configuration:

```yaml
canary:
  enabled: true
  percent: 10
  canaryStorageUri: "s3://models/candidate-ranker-canary"
```

Applying this helm upgrade routes **10%** of traffic to the candidate canary model, allowing performance verification prior to shifting all client workloads.
