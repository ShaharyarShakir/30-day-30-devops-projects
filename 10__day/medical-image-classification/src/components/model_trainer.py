from pathlib import Path

import tensorflow as tf

from src.config import load_config
from src.logger import logger


class ModelTrainer:
    def __init__(self):
        config = load_config()

        self.learning_rate = config.training.learning_rate
        self.epochs = config.training.epochs

        self.input_shape = tuple(config.model.input_shape)
        self.num_classes = config.model.num_classes
        self.model_path = Path(config.model.save_path)

        # Ensure directory for saving model exists
        self.model_path.parent.mkdir(parents=True, exist_ok=True)

    def build_model(self):
        """
        Build and compile a transfer learning model based on DenseNet121.
        """
        logger.info("Building DenseNet121 model...")

        base_model = tf.keras.applications.DenseNet121(
            include_top=False,
            weights="imagenet",
            input_shape=self.input_shape,
        )

        base_model.trainable = False

        inputs = tf.keras.Input(shape=self.input_shape)

        # Medically-safe image augmentation inside the network
        x = tf.keras.layers.RandomRotation(0.05)(inputs)
        x = tf.keras.layers.RandomZoom(0.1)(x)

        # Preprocess input as required by DenseNet
        x = tf.keras.applications.densenet.preprocess_input(x)

        # Feature extraction
        x = base_model(x, training=False)

        # Classifier head
        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        x = tf.keras.layers.Dropout(0.3)(x)

        outputs = tf.keras.layers.Dense(
            self.num_classes,
            activation="sigmoid"
        )(x)

        model = tf.keras.Model(inputs, outputs)

        model.compile(
            optimizer=tf.keras.optimizers.Adam(
                learning_rate=self.learning_rate
            ),
            loss="binary_crossentropy",
            metrics=[
                "accuracy",
                tf.keras.metrics.Precision(),
                tf.keras.metrics.Recall(),
                tf.keras.metrics.AUC(),
            ],
        )

        return model

    def get_callbacks(self):
        """
        Get the list of standard Keras training callbacks.
        """
        return [
            tf.keras.callbacks.ModelCheckpoint(
                filepath=str(self.model_path),
                save_best_only=True,
                monitor="val_accuracy",
            ),
            tf.keras.callbacks.EarlyStopping(
                monitor="val_loss",
                patience=3,
                restore_best_weights=True,
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss",
                factor=0.2,
                patience=2,
            ),
        ]

    def train(self, train_dataset, val_dataset):
        """
        Train the model in two stages:
        Stage 1: Train the custom classification head with base frozen.
        Stage 2: Unfreeze the last 50 layers of the base model and fine-tune with lower learning rate.
        """
        model = self.build_model()

        logger.info("Starting Stage 1: training classification head...")
        history_stage1 = model.fit(
            train_dataset,
            validation_data=val_dataset,
            epochs=self.epochs,
            callbacks=self.get_callbacks(),
        )

        # Stage 2: Fine-Tuning
        base_model = next(
            (layer for layer in model.layers if "densenet121" in layer.name),
            None
        )

        if base_model is not None:
            logger.info("Starting Stage 2: unfreezing last 50 layers for fine-tuning...")
            base_model.trainable = True

            # Freeze all base model layers except the last 50
            for layer in base_model.layers[:-50]:
                layer.trainable = False

            # Recompile with a lower learning rate
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
                loss="binary_crossentropy",
                metrics=[
                    "accuracy",
                    tf.keras.metrics.Precision(),
                    tf.keras.metrics.Recall(),
                    tf.keras.metrics.AUC(),
                ],
            )

            # Fine-tune for another epochs
            logger.info("Training Stage 2 fine-tuning...")
            history_stage2 = model.fit(
                train_dataset,
                validation_data=val_dataset,
                epochs=self.epochs,
                callbacks=self.get_callbacks(),
            )

            # Combine training history from both stages, standardizing Stage 2 keys (removing Keras auto-increment suffixes like _1)
            import re
            stage2_clean = {}
            for k, v in history_stage2.history.items():
                clean_k = re.sub(r'_\d+$', '', k)
                stage2_clean[clean_k] = v

            combined_history = {}
            for key in history_stage1.history.keys():
                combined_history[key] = (
                    history_stage1.history[key] + stage2_clean.get(key, [])
                )

            # Define a helper class to mimic Keras history object
            class CombinedHistory:
                def __init__(self, history_dict):
                    self.history = history_dict

            logger.info("Training completed.")
            return model, CombinedHistory(combined_history)
        else:
            logger.warning("DenseNet base model layer not found. Skipping Stage 2 fine-tuning.")
            logger.info("Training completed.")
            return model, history_stage1
