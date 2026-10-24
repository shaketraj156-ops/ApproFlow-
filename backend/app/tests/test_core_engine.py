import pytest
from app.services.sla_service import compute_reminder_offset, compute_escalation_level
from app.services.priority_service import calculate_priority_score
from app.services.prediction_service import predict_stage_delay_risk

def test_sla_reminder_offsets():
    # 9 -> none, 6.5 -> 7, 2.9 -> 3, 0.4 -> 1, -1 -> none
    assert compute_reminder_offset(9.0) is None
    assert compute_reminder_offset(6.5) == 7
    assert compute_reminder_offset(2.9) == 3
    assert compute_reminder_offset(0.4) == 1
    assert compute_reminder_offset(-1.0) is None

def test_sla_escalation_levels():
    # -1 -> 0, 0 -> 1, 3.9 -> 1, 4 -> 2, 9 -> 3, 15 -> 4
    assert compute_escalation_level(-1.0) == 0
    assert compute_escalation_level(0.0) == 1
    assert compute_escalation_level(3.9) == 1
    assert compute_escalation_level(4.0) == 2
    assert compute_escalation_level(9.0) == 3
    assert compute_escalation_level(15.0) == 4

def test_priority_score_boundaries():
    # All zero should be 0.0
    zero_score = calculate_priority_score(0, 0, 0, 0)
    assert zero_score == 0.0

    # Max caps should be 100.0
    max_score = calculate_priority_score(overdue_days=50, intake_requested=500, deficiency_count=10, age_days=200)
    assert max_score == 100.0

    # Monotonicity test
    s1 = calculate_priority_score(overdue_days=5)
    s2 = calculate_priority_score(overdue_days=10)
    assert s2 > s1

def test_ml_delay_prediction():
    prob = predict_stage_delay_risk(days_in_stage=5, sla_days=10)
    assert 0.0 <= prob <= 1.0

    high_prob = predict_stage_delay_risk(days_in_stage=15, sla_days=10, deficiency_count=3)
    assert high_prob > prob
