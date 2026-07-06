import os
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Target path for baseline data
BASELINE_PATH = os.getenv("BASELINE_PATH", "ml/datasets/processed/dataset.json")

def load_baseline_features() -> pd.DataFrame:
    """
    Loads baseline training dataset features.
    If baseline file does not exist, generates a mock baseline for comparison.
    """
    if os.path.exists(BASELINE_PATH):
        try:
            df = pd.read_json(BASELINE_PATH)
            # Recreate basic numerical features if raw dataset is loaded
            if "skill_match_ratio" not in df.columns:
                df["skill_match_count"] = df["skills"].apply(len)
                df["skill_match_ratio"] = df["skill_match_count"] / 16.0
                df["embedding_similarity"] = df["embedding"].apply(
                    lambda x: float(np.mean(x)) if isinstance(x, list) and len(x) > 0 else 0.0
                )
            return df[["experience_years", "skill_match_ratio", "embedding_similarity"]]
        except Exception as e:
            logger.error(f"Failed to load baseline dataset: {e}")
            
    # Fallback to generating mock baseline
    logger.info("Generating mock baseline features for comparison...")
    rng = np.random.default_rng(42)
    return pd.DataFrame({
        "experience_years": rng.normal(5.0, 2.0, 200).clip(0, 15),
        "skill_match_ratio": rng.uniform(0.1, 0.6, 200),
        "embedding_similarity": rng.normal(0.4, 0.1, 200)
    })

def fetch_production_inference_logs(num_samples: int = 100, simulate_drift: bool = False) -> pd.DataFrame:
    """
    Simulates fetching production inference requests features.
    If simulate_drift is True, we simulate a shift in experience and skill match ratio distributions
    (e.g., an influx of senior candidates with high skill matches).
    """
    logger.info(f"Fetching {num_samples} production inference samples (Simulate Drift = {simulate_drift})...")
    rng = np.random.default_rng(100)
    
    if simulate_drift:
        # Distribution has shifted: more experienced candidates
        experience_years = rng.normal(9.0, 1.5, num_samples).clip(0, 20)
        skill_match_ratio = rng.uniform(0.5, 0.9, num_samples)
        embedding_similarity = rng.normal(0.65, 0.05, num_samples)
    else:
        # Same distribution as baseline
        experience_years = rng.normal(5.1, 1.9, num_samples).clip(0, 15)
        skill_match_ratio = rng.uniform(0.12, 0.58, num_samples)
        embedding_similarity = rng.normal(0.41, 0.09, num_samples)
        
    return pd.DataFrame({
        "experience_years": experience_years,
        "skill_match_ratio": skill_match_ratio,
        "embedding_similarity": embedding_similarity
    })

def detect_drift(baseline: pd.DataFrame, production: pd.DataFrame, alpha: float = 0.05) -> Dict[str, Any]:
    """
    Computes Kolmogorov-Smirnov test to compare distributions of features between
    baseline and production data. If p-value is lower than alpha, drift is detected.
    """
    from scipy.stats import ks_2samp
    
    results = {}
    drift_detected = False
    
    for col in baseline.columns:
        stat, p_val = ks_2samp(baseline[col], production[col])
        is_drifted = bool(p_val < alpha)
        results[col] = {
            "ks_statistic": float(stat),
            "p_value": float(p_val),
            "drift_detected": is_drifted
        }
        if is_drifted:
            logger.warning(f"Drift detected on feature '{col}'! (KS Stat: {stat:.4f}, p-value: {p_val:.4g})")
            drift_detected = True
        else:
            logger.info(f"No drift detected on feature '{col}' (p-value: {p_val:.4f})")
            
    results["overall_drift_detected"] = drift_detected
    return results

def trigger_retraining_pipeline():
    """
    Triggers retraining pipeline by calling Kubeflow Pipelines API or webhook.
    """
    logger.info("Drift threshold exceeded. Triggering Kubeflow Pipelines retraining workflow...")
    # Mock pipeline trigger
    import urllib.request
    try:
        # In a real environment, you would invoke the KFP Client run pipeline endpoint:
        # e.g., kfp.Client(host=...).create_run_from_pipeline_func(...)
        logger.info("Pipeline run successfully triggered in Kubeflow Pipelines orchestrator.")
    except Exception as e:
        logger.error(f"Failed to trigger retraining: {e}")

def run_drift_check(simulate_drift: bool = False):
    """
    Runs the full drift check workflow.
    """
    logger.info("=== STARTING MODEL DRIFT CHECK ===")
    baseline = load_baseline_features()
    production = fetch_production_inference_logs(num_samples=100, simulate_drift=simulate_drift)
    
    drift_results = detect_drift(baseline, production)
    
    if drift_results["overall_drift_detected"]:
        logger.warning("Data drift has occurred. Initiating feedback loop...")
        trigger_retraining_pipeline()
    else:
        logger.info("No substantial data drift detected. Production model remains stable.")
        
    return drift_results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--simulate-drift", action="store_true", help="Force simulation of distribution drift")
    args = parser.parse_args()
    
    run_drift_check(simulate_drift=args.simulate_drift)
