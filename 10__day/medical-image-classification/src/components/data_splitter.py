from pathlib import Path
import shutil

from sklearn.model_selection import train_test_split

from src.config import load_config
from src.logger import logger
from src.utils import create_directory


class DataSplitter:
    def __init__(self):
        config = load_config()

        self.raw_path = (
            Path(config.dataset.raw_data_path)
            / config.dataset.dataset_folder
        )

        self.processed_path = Path(
            config.dataset.processed_data_path
        )

        self.train_ratio = config.split.train
        self.val_ratio = config.split.val
        self.test_ratio = config.split.test
        self.random_state = config.split.random_state

    def split(self):
        logger.info("Starting dataset split...")

        if not self.raw_path.exists():
            raise FileNotFoundError(
                f"Raw dataset directory '{self.raw_path}' not found. "
                "Did you run ingestion and validation first?"
            )

        classes = [
            folder for folder in self.raw_path.iterdir()
            if folder.is_dir()
        ]

        for class_dir in classes:
            images = list(class_dir.glob("*"))

            train_images, temp_images = train_test_split(
                images,
                train_size=self.train_ratio,
                random_state=self.random_state,
                shuffle=True
            )

            val_size = self.val_ratio / (
                self.val_ratio + self.test_ratio
            )

            val_images, test_images = train_test_split(
                temp_images,
                train_size=val_size,
                random_state=self.random_state,
                shuffle=True
            )

            splits = {
                "train": train_images,
                "val": val_images,
                "test": test_images
            }

            for split_name, image_list in splits.items():
                destination = (
                    self.processed_path
                    / split_name
                    / class_dir.name
                )

                create_directory(destination)

                for image in image_list:
                    shutil.copy2(
                        image,
                        destination / image.name
                    )

            logger.info(
                f"{class_dir.name} -> "
                f"Train={len(train_images)}, "
                f"Val={len(val_images)}, "
                f"Test={len(test_images)}"
            )

        logger.info("Dataset splitting completed.")
