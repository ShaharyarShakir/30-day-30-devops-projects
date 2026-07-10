from pathlib import Path

import tensorflow as tf

from src.config import load_config
from src.logger import logger


class DataPreprocessing:
    def __init__(self):
        config = load_config()

        self.batch_size = config.training.batch_size
        self.image_size = (
            config.image.width,
            config.image.height,
        )

        processed = Path(config.dataset.processed_data_path)
        self.train_path = processed / "train"
        self.val_path = processed / "val"
        self.test_path = processed / "test"

    def load_datasets(self):
        """
        Load train, val, and test image datasets from directory,
        apply normalization rescaling, and cache/prefetch for performance optimization.
        """
        logger.info("Loading datasets...")

        # Load datasets from directory
        train_dataset = tf.keras.utils.image_dataset_from_directory(
            self.train_path,
            image_size=self.image_size,
            batch_size=self.batch_size,
            label_mode="binary",
            shuffle=True,
            seed=42,
        )

        val_dataset = tf.keras.utils.image_dataset_from_directory(
            self.val_path,
            image_size=self.image_size,
            batch_size=self.batch_size,
            label_mode="binary",
            shuffle=False,
        )

        test_dataset = tf.keras.utils.image_dataset_from_directory(
            self.test_path,
            image_size=self.image_size,
            batch_size=self.batch_size,
            label_mode="binary",
            shuffle=False,
        )

        # Normalize images to [0, 1] range
        logger.info("Normalizing image datasets...")
        normalization = tf.keras.layers.Rescaling(1.0 / 255)

        train_dataset = train_dataset.map(
            lambda x, y: (normalization(x), y),
            num_parallel_calls=tf.data.AUTOTUNE
        )
        val_dataset = val_dataset.map(
            lambda x, y: (normalization(x), y),
            num_parallel_calls=tf.data.AUTOTUNE
        )
        test_dataset = test_dataset.map(
            lambda x, y: (normalization(x), y),
            num_parallel_calls=tf.data.AUTOTUNE
        )

        # Cache and Prefetch for training speed improvements
        logger.info("Optimizing datasets with caching and prefetching...")
        AUTOTUNE = tf.data.AUTOTUNE
        train_dataset = train_dataset.cache().prefetch(buffer_size=AUTOTUNE)
        val_dataset = val_dataset.cache().prefetch(buffer_size=AUTOTUNE)
        test_dataset = test_dataset.cache().prefetch(buffer_size=AUTOTUNE)

        return train_dataset, val_dataset, test_dataset

    def get_augmentation_pipeline(self) -> tf.keras.Sequential:
        """
        Return a Keras Sequential layer sequence for data augmentation
        to be inserted directly inside the training model architecture.
        """
        return tf.keras.Sequential(
            [
                tf.keras.layers.RandomFlip("horizontal"),
                tf.keras.layers.RandomRotation(0.05),
                tf.keras.layers.RandomZoom(0.1),
            ]
        )
