"""Verify a TFLite model contract before shipping it in SmartVillage."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("model", type=Path)
    parser.add_argument("labels", type=Path)
    args = parser.parse_args()
    try:
        import tensorflow as tf
    except ImportError as exc:
        raise SystemExit("Install training dependencies first: pip install -r tools/requirements-train.txt") from exc

    labels = [line.strip() for line in args.labels.read_text(encoding="utf-8").splitlines() if line.strip()]
    interpreter = tf.lite.Interpreter(model_path=str(args.model))
    interpreter.allocate_tensors()
    inputs = interpreter.get_input_details()
    outputs = interpreter.get_output_details()
    if len(inputs) != 1 or len(outputs) != 1:
        raise SystemExit(f"Expected one input and one output; got {len(inputs)} inputs and {len(outputs)} outputs")
    input_shape = list(inputs[0]["shape"])
    output_shape = list(outputs[0]["shape"])
    class_count = int(output_shape[-1])
    report = {
        "model": str(args.model),
        "input": {"shape": input_shape, "dtype": str(inputs[0]["dtype"]), "quantization": inputs[0].get("quantization")},
        "output": {"shape": output_shape, "dtype": str(outputs[0]["dtype"]), "quantization": outputs[0].get("quantization")},
        "labels": len(labels),
        "label_alignment": len(labels) == class_count,
    }
    print(json.dumps(report, indent=2, default=str))
    if len(labels) != class_count:
        raise SystemExit(f"Label count {len(labels)} does not match output classes {class_count}")


if __name__ == "__main__":
    main()
