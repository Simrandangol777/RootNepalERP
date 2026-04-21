from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / "model" / "smart_restock_random_forest.pkl"

_MODEL = None
_MODEL_LOAD_ERROR = None


def _build_dependency_error(dependency_name, exc):
    return RuntimeError(
        f"Failed to import ML dependency '{dependency_name}'. "
        "Please ensure backend dependencies are installed with compatible versions."
    )


def _load_model():
    global _MODEL, _MODEL_LOAD_ERROR
    if _MODEL is not None:
        return _MODEL
    if _MODEL_LOAD_ERROR is not None:
        raise _MODEL_LOAD_ERROR

    try:
        import joblib
    except Exception as exc:
        _MODEL_LOAD_ERROR = _build_dependency_error("joblib/scikit-learn", exc)
        raise _MODEL_LOAD_ERROR from exc

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
    try:
        import pandas as pd
    except Exception as exc:
        raise _build_dependency_error("pandas", exc) from exc

    model = _load_model()
    try:
        df = pd.DataFrame([input_data])
        prediction = model.predict(df)[0]
    except Exception as exc:
        raise RuntimeError("Failed to generate ML prediction.") from exc

    return max(0, round(float(prediction)))
