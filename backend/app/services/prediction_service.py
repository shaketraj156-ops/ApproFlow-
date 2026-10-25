import logging
import os
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger("approflow.prediction")

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_model = None
_load_attempted = False


def get_model_path() -> Path:
    """Relative paths are resolved against the backend folder, not whatever directory the server started in."""
    path = Path(os.getenv("DELAY_MODEL_PATH") or settings.DELAY_MODEL_PATH)
    return path if path.is_absolute() else _BACKEND_DIR / path


def load_prediction_model():
    """Loads the model once. A missing or broken file is logged a single time, then the heuristic is used."""
    global _model, _load_attempted
    if _load_attempted:
        return _model
    _load_attempted = True
    model_path = get_model_path()
    if not model_path.exists():
        logger.info("No delay model at %s; using heuristic fallback", model_path)
        return None
    try:
        import joblib
        _model = joblib.load(model_path)
    except Exception:
        logger.exception("Could not load delay model from %s; using heuristic fallback", model_path)
        _model = None
    return _model


def _heuristic(days_in_stage: float, sla_days: float, deficiency_count: int) -> float:
    if sla_days <= 0:
        return 0.5
    raw_ratio = max(days_in_stage, 0.0) / float(sla_days)
    risk = min(max(raw_ratio * 0.8 + (deficiency_count * 0.05), 0.05), 0.98)
    return round(risk, 2)


def predict_stage_delay_risk(
    days_in_stage: float,
    sla_days: float,
    deficiency_count: int = 0,
    intake_requested: int = 60,
    age_days: int = 0
) -> float:
    """
    Returns delay probability (0.0 to 1.0).
    Uses trained model if present; otherwise applies deterministic heuristic fallback.
    """
    model = load_prediction_model()
    if model is not None:
        try:
            features = [[days_in_stage, sla_days, deficiency_count, intake_requested, age_days]]
            probs = model.predict_proba(features)
            return round(min(max(float(probs[0][1]), 0.0), 1.0), 2)
        except Exception:
            logger.exception("Delay model prediction failed; using heuristic fallback")

    return _heuristic(days_in_stage, sla_days, deficiency_count)
