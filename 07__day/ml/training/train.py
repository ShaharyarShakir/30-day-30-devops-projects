import os
import time
import pickle
import logging
import requests
from typing import Dict, Any

from dotenv import load_dotenv
# Load project root .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

# Configure standard AWS environment variables for MLflow S3/Garage storage
if "AWS_ACCESS_KEY_ID" not in os.environ:
    os.environ["AWS_ACCESS_KEY_ID"] = os.getenv("GARAGE_ACCESS_KEY_ID", "")
if "AWS_SECRET_ACCESS_KEY" not in os.environ:
    os.environ["AWS_SECRET_ACCESS_KEY"] = os.getenv("GARAGE_SECRET_ACCESS_KEY", "")
if "MLFLOW_S3_ENDPOINT_URL" not in os.environ:
    endpoint = os.getenv("GARAGE_ENDPOINT", "http://localhost:3900")
    if "garage:3900" in endpoint and not os.path.exists("/.dockerenv"):
        endpoint = endpoint.replace("garage:3900", "localhost:3900")
    os.environ["MLFLOW_S3_ENDPOINT_URL"] = endpoint

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb
import lightgbm as lgb
import mlflow
import mlflow.sklearn
import mlflow.xgboost
import mlflow.lightgbm

from ml.training.config import (
    MLFLOW_TRACKING_URI,
    MLFLOW_EXPERIMENT_NAME,
    PARAM_GRIDS,
    MODEL_DIR,
    BASE_DIR
)
from ml.training.data_loader import load_and_validate_dataset
from ml.training.feature_engineering import extract_features_df
from ml.training.evaluate import evaluate_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_mlflow():
    """
    Checks connection to the configured MLflow tracking server.
    If server is unreachable, falls back to logging runs locally in a folder.
    """
    logger.info("Initializing MLflow tracking configuration...")
    try:
        # Check tracking server health
        health_url = f"{MLFLOW_TRACKING_URI}/health" if not MLFLOW_TRACKING_URI.endswith("/health") else MLFLOW_TRACKING_URI
        # If MLflow tracking URI is not an HTTP URL (e.g. file path), skip ping
        if MLFLOW_TRACKING_URI.startswith("http"):
            response = requests.get(health_url, timeout=3)
            if response.status_code == 200:
                mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
                logger.info(f"Connected to MLflow Tracking Server: {MLFLOW_TRACKING_URI}")
                mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)
                return
        else:
            mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
            mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)
            return
    except Exception as e:
        logger.warning(f"MLflow remote server at {MLFLOW_TRACKING_URI} is unreachable: {e}")
        
    # Local fallback
    local_tracking_uri = f"file://{os.path.join(BASE_DIR, 'mlruns')}"
    mlflow.set_tracking_uri(local_tracking_uri)
    logger.info(f"Using local MLflow tracking directory: {local_tracking_uri}")
    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)

def get_base_model(name: str):
    """
    Returns an un-tuned estimator based on model name.
    """
    if name == "Logistic Regression":
        return LogisticRegression(class_weight="balanced", random_state=42)
    elif name == "Random Forest":
        return RandomForestClassifier(class_weight="balanced", random_state=42)
    elif name == "XGBoost":
        return xgb.XGBClassifier(eval_metric="logloss", random_state=42)
    elif name == "LightGBM":
        return lgb.LGBMClassifier(class_weight="balanced", random_state=42)
    else:
        raise ValueError(f"Unknown model name: {name}")

def log_model_to_mlflow(name: str, model: Any, params: Dict[str, Any], metrics: Dict[str, float], plot_dir: str):
    """
    Handles logging the final trained model, its metrics, parameters, and generated plots into MLflow.
    """
    with mlflow.start_run(run_name=name) as run:
        # Log hyperparameters
        mlflow.log_params(params)
        
        # Log evaluation metrics
        mlflow.log_metrics(metrics)
        
        # Log plots
        for img in ["confusion_matrix.png", "roc_curve.png", "feature_importance.png"]:
            img_path = os.path.join(plot_dir, img)
            if os.path.exists(img_path):
                mlflow.log_artifact(img_path, artifact_path="evaluation_plots")
                
        # Log model file based on framework
        if name == "Logistic Regression" or name == "Random Forest":
            mlflow.sklearn.log_model(model, artifact_path="model")
        elif name == "XGBoost":
            mlflow.xgboost.log_model(model, artifact_path="model")
        elif name == "LightGBM":
            mlflow.lightgbm.log_model(model, artifact_path="model")
            
        logger.info(f"Run complete for {name}. Run ID: {run.info.run_id}")
        return run.info.run_id

def run_training_pipeline():
    """
    Loads dataset, extracts features, performs hyperparameter Grid Search across
    candidate models, selects the best configurations, and logs all details to MLflow.
    """
    setup_mlflow()
    
    # 1. Load Dataset
    df = load_and_validate_dataset()
    
    # 2. Feature Engineering
    X, y = extract_features_df(df)
    
    # 3. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    temp_plot_dir = os.path.join(BASE_DIR, "temp_plots")
    os.makedirs(temp_plot_dir, exist_ok=True)
    
    best_overall_f1 = 0.0
    best_overall_model = None
    best_overall_name = ""
    best_overall_run_id = ""
    
    # 4. Model Training & Parameter Tuning Loop
    for model_name, param_grid in PARAM_GRIDS.items():
        logger.info(f"Training and tuning model: {model_name}...")
        
        base_model = get_base_model(model_name)
        
        start_time = time.time()
        
        # Perform 3-fold Grid Search cross validation
        grid_search = GridSearchCV(
            estimator=base_model,
            param_grid=param_grid,
            cv=3,
            scoring="f1",
            n_jobs=-1
        )
        grid_search.fit(X_train, y_train)
        
        training_time = time.time() - start_time
        
        # Select best estimator
        best_model = grid_search.best_estimator_
        best_params = grid_search.best_params_
        best_params["training_time_seconds"] = training_time
        
        # Evaluate model on test split
        metrics = evaluate_model(best_model, X_test, y_test, temp_plot_dir)
        metrics["training_time_seconds"] = training_time
        
        logger.info(f"Best parameters for {model_name}: {grid_search.best_params_}")
        logger.info(f"Test performance metrics: F1={metrics['f1']:.3f}, Acc={metrics['accuracy']:.3f}, AUC={metrics['roc_auc']:.3f}")
        
        # Log to MLflow
        run_id = log_model_to_mlflow(model_name, best_model, best_params, metrics, temp_plot_dir)
        
        # Keep track of the top performing candidate
        if metrics["f1"] > best_overall_f1:
            best_overall_f1 = metrics["f1"]
            best_overall_model = best_model
            best_overall_name = model_name
            best_overall_run_id = run_id
            
    # Save the absolute best model locally as a pickle file
    if best_overall_model is not None:
        best_model_path = os.path.join(MODEL_DIR, "best_model.pkl")
        with open(best_model_path, "wb") as f:
            pickle.dump(best_overall_model, f)
            
        logger.info(f"=== TRAINING RUN COMPLETE ===")
        logger.info(f"Best Model Overall: {best_overall_name} with F1-score of {best_overall_f1:.4f}")
        logger.info(f"Saved locally to: {best_model_path}")
        logger.info(f"Associated MLflow Run ID: {best_overall_run_id}")
        
        # Create a small text metadata file about the best run
        meta_path = os.path.join(MODEL_DIR, "best_model_meta.json")
        with open(meta_path, "w") as f:
            import json
            json.dump({
                "model_name": best_overall_name,
                "f1_score": best_overall_f1,
                "run_id": best_overall_run_id,
                "timestamp": time.time()
            }, f, indent=2)
            
    # Cleanup temporary plots
    import shutil
    if os.path.exists(temp_plot_dir):
        shutil.rmtree(temp_plot_dir)

if __name__ == "__main__":
    run_training_pipeline()
