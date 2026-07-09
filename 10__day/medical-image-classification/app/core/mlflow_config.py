"""
MLflow configuration module for experiment tracking and model registry.
"""

import os
import mlflow
from typing import Optional


class MLflowConfig:
    """Configure MLflow tracking and S3 artifact storage."""

    def __init__(self):
        self.tracking_uri = os.getenv(
            "MLFLOW_TRACKING_URI",
            "http://localhost:5000",
        )
        self.s3_endpoint_url = os.getenv(
            "AWS_S3_ENDPOINT_URL",
            "http://localhost:3900",
        )
        self.aws_access_key_id = os.getenv(
            "AWS_ACCESS_KEY_ID",
            "garage",
        )
        self.aws_secret_access_key = os.getenv(
            "AWS_SECRET_ACCESS_KEY",
            "garage123456",
        )

    def setup(self) -> None:
        """Initialize MLflow tracking server and S3 configuration."""
        mlflow.set_tracking_uri(self.tracking_uri)
        
        # Set S3 environment variables for artifact storage
        os.environ["AWS_ACCESS_KEY_ID"] = self.aws_access_key_id
        os.environ["AWS_SECRET_ACCESS_KEY"] = self.aws_secret_access_key
        os.environ["AWS_S3_ENDPOINT_URL"] = self.s3_endpoint_url

    def create_experiment(
        self,
        experiment_name: str,
        artifact_location: Optional[str] = None,
    ) -> str:
        """
        Create or get an MLflow experiment.

        Args:
            experiment_name: Name of the experiment
            artifact_location: Optional custom artifact location

        Returns:
            Experiment ID
        """
        existing = mlflow.get_experiment_by_name(experiment_name)
        if existing:
            return existing.experiment_id

        if artifact_location is None:
            artifact_location = f"s3://mlflow/experiments/{experiment_name}"

        return mlflow.create_experiment(
            experiment_name,
            artifact_location=artifact_location,
        )

    def log_run(
        self,
        experiment_name: str,
        run_name: str,
        params: dict,
        metrics: dict,
        artifacts: Optional[dict] = None,
    ) -> str:
        """
        Log a training run to MLflow.

        Args:
            experiment_name: Name of the experiment
            run_name: Name of the run
            params: Dictionary of parameters
            metrics: Dictionary of metrics
            artifacts: Dictionary of artifact_name -> artifact_path

        Returns:
            Run ID
        """
        experiment_id = self.create_experiment(experiment_name)
        
        with mlflow.start_run(
            experiment_id=experiment_id,
            run_name=run_name,
        ) as run:
            # Log parameters
            for key, value in params.items():
                mlflow.log_param(key, value)

            # Log metrics
            for key, value in metrics.items():
                mlflow.log_metric(key, value)

            # Log artifacts
            if artifacts:
                for name, path in artifacts.items():
                    if os.path.isdir(path):
                        mlflow.log_artifacts(path, artifact_path=name)
                    else:
                        mlflow.log_artifact(path, artifact_path=name)

            return run.info.run_id


# Global MLflow config instance
mlflow_config = MLflowConfig()
