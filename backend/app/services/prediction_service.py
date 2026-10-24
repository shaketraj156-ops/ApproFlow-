import os

_model = None

def get_model_path() -> str:
    return os.getenv("DELAY_MODEL_PATH", "models/delay_model.joblib")

def load_prediction_model():
    global _model
    if _model is not None:
        return _model
    model_path = get_model_path()
    if os.path.exists(model_path):
        try:
            import joblib
            _model = joblib.load(model_path)
        except Exception:
            _model = None
    return _model

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
            return round(float(probs[0][1]), 2)
        except Exception:
            pass

    # Statistical fallback: days_in_stage / sla_days with moderation
    if sla_days <= 0:
        return 0.5
    raw_ratio = days_in_stage / float(sla_days)
    risk = min(max(raw_ratio * 0.8 + (deficiency_count * 0.05), 0.05), 0.98)
    return round(risk, 2)
