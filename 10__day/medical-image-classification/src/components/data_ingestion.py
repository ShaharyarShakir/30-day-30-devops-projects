from pathlib import Path

from huggingface_hub import snapshot_download

from src.config import load_config
from src.logger import logger


class DataIngestion:
    def __init__(self):
        self.config = load_config()

        self.repo_id = self.config.dataset.repo_id
        self.repo_type = self.config.dataset.repo_type
        self.dataset_folder = self.config.dataset.dataset_folder

        self.raw_path = Path(self.config.dataset.raw_data_path)

    def download_dataset(self):
        """
        Download only the specified dataset folder from Hugging Face Hub dataset repo.
        """
        logger.info(f"Downloading dataset folder '{self.dataset_folder}' from {self.repo_id}...")

        snapshot_download(
            repo_id=self.repo_id,
            repo_type=self.repo_type,
            local_dir=self.raw_path,
            allow_patterns=f"{self.dataset_folder}/**",
        )

        logger.info("Dataset downloaded successfully.")
