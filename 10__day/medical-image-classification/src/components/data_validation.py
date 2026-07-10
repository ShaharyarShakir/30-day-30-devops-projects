from pathlib import Path
from PIL import Image

from src.config import load_config
from src.logger import logger


class DataValidation:
    def __init__(self):
        config = load_config()

        self.raw_path = (
            Path(config.dataset.raw_data_path)
            / config.dataset.dataset_folder
        )

    def validate(self):
        logger.info("Starting data validation...")

        if not self.raw_path.exists():
            raise FileNotFoundError(
                f"Raw dataset directory '{self.raw_path}' not found. "
                "Did you run ingestion first?"
            )

        classes = [
            folder for folder in self.raw_path.iterdir()
            if folder.is_dir()
        ]

        if not classes:
            raise ValueError("No class folders found!")

        required_classes = {"NORMAL", "PNEUMONIA"}
        found_classes = {folder.name for folder in classes}

        if found_classes != required_classes:
            raise ValueError(
                f"Expected {required_classes}, found {found_classes}"
            )

        total_images = 0
        corrupted = []

        for class_dir in classes:
            images = list(class_dir.glob("*"))

            logger.info(
                f"{class_dir.name}: {len(images)} images"
            )

            total_images += len(images)

            for image_path in images:
                try:
                    with Image.open(image_path) as img:
                        img.verify()
                except Exception:
                    corrupted.append(image_path)

        logger.info(f"Total images: {total_images}")

        if corrupted:
            logger.warning(
                f"Found {len(corrupted)} corrupted images"
            )
            for img in corrupted:
                logger.warning(img)
        else:
            logger.info("No corrupted images found.")

        logger.info("Data validation completed.")
