import os

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.getenv("DATASET_PATH", os.path.join(BASE_DIR, "datasets", "processed", "dataset.json"))
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(BASE_DIR, "models"))

# MLflow Config
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
# Smart fallback: if MLflow URI uses the internal container name "mlflow" but we run on host, map it to localhost.
if "mlflow:5000" in MLFLOW_TRACKING_URI and not os.path.exists("/.dockerenv"):
    MLFLOW_TRACKING_URI = MLFLOW_TRACKING_URI.replace("mlflow:5000", "localhost:5000")

MLFLOW_EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "Resume-Ranking-v1")
REGISTERED_MODEL_NAME = os.getenv("REGISTERED_MODEL_NAME", "candidate-ranker")

# Target Skills for Feature Engineering
TARGET_DEVOPS_SKILLS = [
    "python", "go", "golang", "docker", "kubernetes", "k8s", "aws", "gcp", "azure",
    "terraform", "ansible", "ci/cd", "jenkins", "git", "postgresql", "fastapi"
]

# Classification Settings
QUALITY_THRESHOLD_F1 = 0.80  # Threshold to promote models to Model Registry Staging

# Hyperparameter search spaces for candidate models
PARAM_GRIDS = {
    "Logistic Regression": {
        "C": [0.1, 1.0, 10.0],
        "max_iter": [500]
    },
    "Random Forest": {
        "n_estimators": [50, 100, 150],
        "max_depth": [5, 10, None],
        "random_state": [42]
    },
    "XGBoost": {
        "n_estimators": [50, 100],
        "max_depth": [3, 5, 7],
        "learning_rate": [0.01, 0.1, 0.2],
        "random_state": [42]
    },
    "LightGBM": {
        "n_estimators": [50, 100],
        "max_depth": [3, 5, 7],
        "learning_rate": [0.01, 0.1, 0.2],
        "random_state": [42],
        "verbosity": [-1]
    }
}
