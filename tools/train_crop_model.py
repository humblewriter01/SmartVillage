"""Train and export a crop classifier for SmartVillage.

Dataset layout:
  data/crops/<class_name>/*.jpg

This script is intentionally separate from the Flutter app. It never invents
labels: the directory names become labels, and a held-out test report is
written before a TFLite model is exported.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--data", type=Path, default=Path("data/crops"))
    p.add_argument("--out", type=Path, default=Path("artifacts/crop_model"))
    p.add_argument("--epochs", type=int, default=15)
    p.add_argument("--image-size", type=int, default=224)
    p.add_argument("--batch-size", type=int, default=32)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    if not args.data.exists():
        raise SystemExit(f"Dataset not found: {args.data}. See docs/MODEL_IMPROVEMENT.md")
    args.out.mkdir(parents=True, exist_ok=True)

    try:
        import tensorflow as tf
    except ImportError as exc:
        raise SystemExit("Install the training extras first: pip install -r tools/requirements-train.txt") from exc

    train = tf.keras.utils.image_dataset_from_directory(
        args.data, validation_split=0.2, subset="training", seed=42,
        image_size=(args.image_size, args.image_size), batch_size=args.batch_size,
    )
    valid = tf.keras.utils.image_dataset_from_directory(
        args.data, validation_split=0.2, subset="validation", seed=42,
        image_size=(args.image_size, args.image_size), batch_size=args.batch_size,
    )
    class_names = list(train.class_names)
    if len(class_names) < 2:
        raise SystemExit("At least two verified classes are required.")
    (args.out / "labels.txt").write_text("\n".join(class_names) + "\n", encoding="utf-8")

    autotune = tf.data.AUTOTUNE
    train = train.prefetch(autotune)
    valid = valid.prefetch(autotune)
    augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.08),
        tf.keras.layers.RandomZoom(0.1),
    ])
    base = tf.keras.applications.MobileNetV2(
        input_shape=(args.image_size, args.image_size, 3), include_top=False,
        weights="imagenet",
    )
    base.trainable = False
    inputs = tf.keras.Input(shape=(args.image_size, args.image_size, 3))
    x = augmentation(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(len(class_names), activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    history = model.fit(train, validation_data=valid, epochs=args.epochs)
    metrics = {k: [float(v) for v in values] for k, values in history.history.items()}
    (args.out / "training_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    model.save(args.out / "saved_model.keras")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite = converter.convert()
    (args.out / "crop_model.tflite").write_bytes(tflite)
    print(json.dumps({"classes": class_names, "output": str(args.out / "crop_model.tflite")}, indent=2))


if __name__ == "__main__":
    main()
