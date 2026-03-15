from pathlib import Path

import joblib
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent / "model" / "smart_restock_random_forest.pkl"

_MODEL = None
_MODEL_LOAD_ERROR = None


def _load_model():
    global _MODEL, _MODEL_LOAD_ERROR
    if _MODEL is not None:
        return _MODEL
    if _MODEL_LOAD_ERROR is not None:
        raise _MODEL_LOAD_ERROR
    try:
        _MODEL = joblib.load(MODEL_PATH)
        return _MODEL
    except Exception as exc:
        _MODEL_LOAD_ERROR = RuntimeError(
            "Failed to load ML model. This is usually caused by a scikit-learn "
            "version mismatch between training and runtime. "
            "Re-train the model with the current sklearn version or install the "
            "version used to train the model (likely scikit-learn==1.5.1)."
        )
        raise _MODEL_LOAD_ERROR from exc


def predict_restock(input_data: dict):
    model = _load_model()
    df = pd.DataFrame([input_data])
    prediction = model.predict(df)[0]
    return round(float(prediction))
