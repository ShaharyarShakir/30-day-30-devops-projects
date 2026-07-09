import tensorflow as tf
import numpy as np
import cv2

def make_gradcam_heatmap(img_array, model, last_conv_layer_name="conv5_block16_concat"):
    """
    Generate Grad-CAM heatmap for the given input image array and model.
    Handles nested 'densenet121' model inside the outer model wrapper.
    """
    # 1. Trace the input through the layers of the main model up to the base model
    x = img_array
    for layer in model.layers:
        if layer.name == "densenet121":
            break
        try:
            x = layer(x, training=False)
        except TypeError:
            x = layer(x)

    base_model = model.get_layer("densenet121")

    # 2. Construct a sub-model for the base model to get the last conv layer output
    base_grad_model = tf.keras.Model(
        base_model.inputs,
        [base_model.get_layer(last_conv_layer_name).output, base_model.output]
    )

    # 3. Record operations in tape
    with tf.GradientTape() as tape:
        conv_outputs, base_outputs = base_grad_model(x)
        # Pass the base model output through the remaining layers of the main model
        y = base_outputs
        start_remaining = False
        for layer in model.layers:
            if start_remaining:
                try:
                    y = layer(y, training=False)
                except TypeError:
                    y = layer(y)
            if layer.name == "densenet121":
                start_remaining = True

        preds = y
        # Determine target channel dynamically based on predicted probability
        prob = preds[0][0]
        if prob > 0.5:
            class_channel = preds[:, 0]
        else:
            class_channel = 1.0 - preds[:, 0]

    # Compute gradients of class channel score w.r.t the conv outputs
    grads = tape.gradient(class_channel, conv_outputs)

    # Average gradients spatially
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # Weighted sum of feature maps
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    # Apply ReLU and normalize
    heatmap = np.maximum(heatmap, 0)
    max_val = np.max(heatmap)
    if max_val == 0:
        max_val = 1e-10
    heatmap /= max_val

    return heatmap.numpy() if hasattr(heatmap, "numpy") else heatmap

def overlay_heatmap(heatmap, image_np, alpha=0.4):
    """
    Overlay Grad-CAM heatmap onto the original image.
    Expects heatmap as a 2D float array in [0, 1] and image_np as an RGB uint8 array [H, W, 3].
    """
    # Resize heatmap to match image size
    heatmap_resized = cv2.resize(heatmap, (image_np.shape[1], image_np.shape[0]))

    # Convert heatmap to uint8 in [0, 255]
    heatmap_uint8 = np.uint8(255 * heatmap_resized)

    # Apply JET colormap
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

    # Convert colormap from BGR to RGB (OpenCV default is BGR)
    heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

    # Superimpose original image and color heatmap
    overlay = cv2.addWeighted(image_np, 1 - alpha, heatmap_color, alpha, 0)

    return overlay
