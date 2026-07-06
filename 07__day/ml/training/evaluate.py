import os
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend to prevent UI popups in container/CI environments
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve
)
from typing import Dict, List, Any

def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
    """
    Computes all standard classification metrics.
    """
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0))
    }
    
    # Calculate ROC-AUC if probability scores are valid and there are both classes present
    if y_prob is not None and len(np.unique(y_true)) > 1:
        metrics["roc_auc"] = float(roc_auc_score(y_true, y_prob))
    else:
        metrics["roc_auc"] = 0.5
        
    return metrics

def plot_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, output_path: str):
    """
    Generates and saves a confusion matrix plot.
    """
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", cbar=False,
                xticklabels=["Not Match (0)", "Match (1)"],
                yticklabels=["Not Match (0)", "Match (1)"])
    plt.title("Confusion Matrix")
    plt.ylabel("Actual Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

def plot_roc_curve(y_true: np.ndarray, y_prob: np.ndarray, output_path: str):
    """
    Generates and saves a ROC-AUC Curve plot.
    """
    if len(np.unique(y_true)) <= 1 or y_prob is None:
        return
        
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    auc_score = roc_auc_score(y_true, y_prob)
    
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, color="darkorange", lw=2, label=f"ROC Curve (AUC = {auc_score:.3f})")
    plt.plot([0, 1], [0, 1], color="navy", lw=2, linestyle="--")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("Receiver Operating Characteristic (ROC) Curve")
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

def plot_feature_importance(model: Any, feature_names: List[str], output_path: str):
    """
    Generates and saves feature importance or coefficient weights plots.
    """
    importances = None
    title = "Feature Importances"
    
    # Random Forest, XGBoost, LightGBM
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    # Logistic Regression
    elif hasattr(model, "coef_"):
        importances = np.abs(model.coef_[0])
        title = "Feature Coefficients (Absolute Value)"
        
    if importances is None:
        return
        
    # Create DataFrame for ordering
    df_importance = pd.DataFrame({
        "Feature": feature_names,
        "Importance": importances
    }).sort_values(by="Importance", ascending=False)
    
    # Limit to top 15 features if excessive
    df_importance = df_importance.head(15)
    
    plt.figure(figsize=(8, 6))
    sns.barplot(x="Importance", y="Feature", data=df_importance, palette="viridis")
    plt.title(title)
    plt.xlabel("Relative Score")
    plt.ylabel("Feature Name")
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

def evaluate_model(model: Any, X_test: pd.DataFrame, y_test: pd.Series, output_dir: str) -> Dict[str, float]:
    """
    Runs model predictions on the test set, calculates all metrics,
    and generates visualization plots saved in output_dir.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    y_pred = model.predict(X_test)
    y_prob = None
    
    if hasattr(model, "predict_proba"):
        y_prob = model.predict_proba(X_test)[:, 1]
    
    metrics = calculate_metrics(y_test.values, y_pred, y_prob)
    
    # Generate and save plots
    plot_confusion_matrix(y_test.values, y_pred, os.path.join(output_dir, "confusion_matrix.png"))
    plot_roc_curve(y_test.values, y_prob, os.path.join(output_dir, "roc_curve.png"))
    plot_feature_importance(model, list(X_test.columns), os.path.join(output_dir, "feature_importance.png"))
    
    return metrics
