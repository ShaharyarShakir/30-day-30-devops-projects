from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (
    auc,
    classification_report as sk_classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
    precision_recall_curve,
    roc_curve,
)

from src.logger import logger


class ModelEvaluator:
    def __init__(self):
        self.artifacts = Path("artifacts")
        self.artifacts.mkdir(exist_ok=True)

    def predict(self, model, test_dataset):
        """
        Run predictions on the test dataset and return true labels, predicted classes,
        and predictions probabilities.
        """
        logger.info("Running predictions on the test dataset...")
        y_true = []
        for _, labels in test_dataset:
            y_true.extend(labels.numpy())
        
        y_true = np.array(y_true).flatten()
        y_prob = model.predict(test_dataset, verbose=0).flatten()
        y_pred = (y_prob > 0.5).astype(int)

        return y_true, y_pred, y_prob


    def classification_report(self, y_true, y_pred):
        """
        Generate classification report and write it to classification_report.txt.
        """
        logger.info("Generating classification report...")
        report = sk_classification_report(
            y_true,
            y_pred,
            target_names=["NORMAL", "PNEUMONIA"],
        )

        print(report)

        report_path = self.artifacts / "classification_report.txt"
        with open(report_path, "w") as f:
            f.write(report)
        logger.info(f"Classification report saved to {report_path}")

    def confusion_matrix_plot(self, y_true, y_pred):
        """
        Plot and save the confusion matrix.
        """
        logger.info("Generating confusion matrix plot...")
        cm = confusion_matrix(y_true, y_pred)

        disp = ConfusionMatrixDisplay(
            confusion_matrix=cm,
            display_labels=["NORMAL", "PNEUMONIA"],
        )

        fig, ax = plt.subplots(figsize=(6, 6))
        disp.plot(ax=ax, cmap=plt.cm.Blues, values_format="d")

        plot_path = self.artifacts / "confusion_matrix.png"
        plt.savefig(
            plot_path,
            dpi=300,
            bbox_inches="tight",
        )
        plt.close()
        logger.info(f"Confusion matrix plot saved to {plot_path}")

    def roc_curve_plot(self, y_true, y_prob):
        """
        Plot and save the ROC curve.
        """
        logger.info("Generating ROC curve plot...")
        fpr, tpr, _ = roc_curve(y_true, y_prob)
        roc_auc = auc(fpr, tpr)

        plt.figure(figsize=(6, 6))
        plt.plot(
            fpr,
            tpr,
            color="darkorange",
            lw=2,
            label=f"ROC curve (AUC = {roc_auc:.3f})",
        )
        plt.plot([0, 1], [0, 1], color="navy", lw=2, linestyle="--")
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.title("Receiver Operating Characteristic (ROC)")
        plt.legend(loc="lower right")

        plot_path = self.artifacts / "roc_curve.png"
        plt.savefig(
            plot_path,
            dpi=300,
            bbox_inches="tight",
        )
        plt.close()
        logger.info(f"ROC curve plot saved to {plot_path}")

    def precision_recall_plot(self, y_true, y_prob):
        """
        Plot and save the Precision-Recall curve.
        """
        logger.info("Generating Precision-Recall curve plot...")
        precision, recall, _ = precision_recall_curve(
            y_true,
            y_prob,
        )

        plt.figure(figsize=(6, 6))
        plt.plot(recall, precision, color="blue", lw=2, label="PR curve")
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel("Recall")
        plt.ylabel("Precision")
        plt.title("Precision-Recall Curve")
        plt.legend(loc="lower left")

        plot_path = self.artifacts / "precision_recall_curve.png"
        plt.savefig(
            plot_path,
            dpi=300,
            bbox_inches="tight",
        )
        plt.close()
        logger.info(f"Precision-Recall curve plot saved to {plot_path}")

    def evaluate(self, model, test_dataset):
        """
        Perform complete model evaluation workflow.
        """
        logger.info("Starting model evaluation...")
        y_true, y_pred, y_prob = self.predict(
            model,
            test_dataset,
        )

        self.classification_report(
            y_true,
            y_pred,
        )

        self.confusion_matrix_plot(
            y_true,
            y_pred,
        )

        self.roc_curve_plot(
            y_true,
            y_prob,
        )

        self.precision_recall_plot(
            y_true,
            y_prob,
        )
        logger.info("Model evaluation completed.")
