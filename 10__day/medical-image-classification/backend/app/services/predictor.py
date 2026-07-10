import numpy as np
import tensorflow as tf
from PIL import Image

from app.core.config import load_config

# Load config settings
config = load_config()
IMG_SIZE = (config.image.width, config.image.height)
MODEL_PATH = config.model.save_path

# Load the compiled Keras model once at module level
model = tf.keras.models.load_model(MODEL_PATH)


def preprocess(image: Image.Image):
    """
    Preprocess image as expected by DenseNet121 and the training pipeline.
    """
    image = image.convert("RGB")
    image = image.resize(IMG_SIZE)
    image_arr = np.array(image)
    image_preprocessed = tf.keras.applications.densenet.preprocess_input(image_arr)
    # Add batch dimension
    image_batched = np.expand_dims(image_preprocessed, axis=0)
    return image_batched


def predict(image: Image.Image):
    """
    Verify image type, execute predictions, and return prediction class and confidence score.
    """
    image_tensor = preprocess(image)
    probability = float(model.predict(image_tensor, verbose=0)[0][0])

    config_curr = load_config()
    threshold = config_curr.inference.threshold

    prediction = "PNEUMONIA" if probability > threshold else "NORMAL"
    confidence = probability if probability > threshold else 1 - probability

    return prediction, confidence
