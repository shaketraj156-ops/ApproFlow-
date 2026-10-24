from typing import Optional, List
from datetime import datetime, timezone, timedelta

def compute_reminder_offset(days_left: float, offsets: List[int] = [7, 3, 1]) -> Optional[int]:
    """
    Checks if days_left qualifies for a reminder offset.
    Returns the smallest configured offset already entered.
    e.g. 9.0 -> None; 6.5 -> 7; 2.9 -> 3; 0.4 -> 1; -1.0 -> None.
    """
    if days_left <= 0:
        return None
    sorted_offsets = sorted(offsets)  # [1, 3, 7]
    for offset in sorted_offsets:
        if days_left <= offset:
            return offset
    return None

def compute_escalation_level(days_overdue: float) -> int:
    """
    Escalation level after overdue:
    -1 or < 0: 0 (No escalation)
    0 to 3.99 days: Level 1 (Owner Officer)
    4 to 7.99 days: Level 2 (Section Head)
    8 to 14.99 days: Level 3 (Regional Head)
    >= 15 days: Level 4 (National Head)
    """
    if days_overdue < 0:
        return 0
    if days_overdue < 4:
        return 1
    if days_overdue < 8:
        return 2
    if days_overdue < 15:
        return 3
    return 4

def calculate_due_date(entered_at: datetime, sla_days: int) -> datetime:
    return entered_at + timedelta(days=sla_days)
