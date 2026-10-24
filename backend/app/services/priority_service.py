from datetime import datetime, timezone

def calculate_priority_score(
    overdue_days: int = 0,
    intake_requested: int = 60,
    deficiency_count: int = 0,
    age_days: int = 0
) -> float:
    """
    Computes priority score (0.0 to 100.0):
    priority = 100 * ( 0.40 * min(overdue_days / 30, 1)
                     + 0.25 * min(intake_requested / 300, 1)
                     + 0.20 * min(deficiency_count / 5, 1)
                     + 0.15 * min(age_days / 120, 1) )
    """
    c_overdue = min(max(0, overdue_days) / 30.0, 1.0)
    c_intake = min(max(0, intake_requested) / 300.0, 1.0)
    c_deficiency = min(max(0, deficiency_count) / 5.0, 1.0)
    c_age = min(max(0, age_days) / 120.0, 1.0)

    score = 100.0 * (
        (0.40 * c_overdue) +
        (0.25 * c_intake) +
        (0.20 * c_deficiency) +
        (0.15 * c_age)
    )
    return round(score, 2)
