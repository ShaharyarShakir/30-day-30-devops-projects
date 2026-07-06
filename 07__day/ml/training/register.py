import os
import json
import logging
from mlflow.tracking import MlflowClient
import mlflow

from ml.training.config import (
    REGISTERED_MODEL_NAME,
    QUALITY_THRESHOLD_F1,
    MODEL_DIR,
    MLFLOW_TRACKING_URI
)
from ml.training.train import setup_mlflow

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def register_best_model():
    """
    Reads the metadata of the best trained model, validates it against the F1-score
    quality threshold, registers it in MLflow, and transitions it to Staging.
    """
    meta_path = os.path.join(MODEL_DIR, "best_model_meta.json")
    if not os.path.exists(meta_path):
        logger.error(f"Best model metadata file not found at {meta_path}. Run training first.")
        return False
        
    with open(meta_path, "r") as f:
        meta = json.load(f)
        
    best_model_name = meta["model_name"]
    best_f1 = meta["f1_score"]
    run_id = meta["run_id"]
    
    logger.info(f"Loaded best candidate: {best_model_name} with F1-score = {best_f1:.4f} (Run ID: {run_id})")
    
    # Quality Gate Check
    if best_f1 < QUALITY_THRESHOLD_F1:
        logger.warning(
            f"Model did not pass the quality threshold (F1: {best_f1:.4f} < {QUALITY_THRESHOLD_F1:.4f}). "
            "Model registration rejected."
        )
        return False
        
    logger.info(f"Model passed the quality gate (F1: {best_f1:.4f} >= {QUALITY_THRESHOLD_F1:.4f}). Registering...")
    
    setup_mlflow()
    
    # Register the model
    try:
        model_uri = f"runs:/{run_id}/model"
        logger.info(f"Registering model from {model_uri} under name '{REGISTERED_MODEL_NAME}'...")
        
        # In local fallback mode, MLflow model registry is not supported. We check if tracking URI is local.
        tracking_uri = mlflow.get_tracking_uri()
        if tracking_uri.startswith("file://"):
            logger.info("Using local files tracking. Mocking registration since Model Registry requires SQL database backend.")
            logger.info(f"Successfully registered model '{REGISTERED_MODEL_NAME}' version 1 (local simulation).")
            logger.info(f"Promoted '{REGISTERED_MODEL_NAME}' version 1 to 'Staging' (local simulation).")
            return True
            
        # Register model with remote MLflow registry
        model_details = mlflow.register_model(model_uri=model_uri, name=REGISTERED_MODEL_NAME)
        version = model_details.version
        
        logger.info(f"Model registered successfully. Version: {version}")
        
        # Transition stage to Staging
        client = MlflowClient()
        logger.info(f"Promoting model version {version} to 'Staging'...")
        client.transition_model_version_stage(
            name=REGISTERED_MODEL_NAME,
            version=version,
            stage="Staging",
            archive_existing_versions=True
        )
        
        logger.info(f"Successfully registered and promoted '{REGISTERED_MODEL_NAME}' version {version} to Staging.")
        return True
        
    except Exception as e:
        logger.error(f"Failed to register model in MLflow: {e}")
        return False

if __name__ == "__main__":
    register_best_model()
