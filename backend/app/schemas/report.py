from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class KpiSummaryResponse(BaseModel):
    total_applications: int
    pending_actions: int
    overdue_count: int
    due_this_week: int
    avg_processing_days: float
    evc_scheduled_count: int

class FunnelStageItem(BaseModel):
    stage_code: str
    stage_name: str
    sequence_order: int
    application_count: int
    total_intake_requested: int
    avg_priority_score: float

class BottleneckHeatmapItem(BaseModel):
    region: str
    stage_code: str
    stage_name: str
    pending_count: int
    avg_days_in_stage: float
    breach_count: int
    breach_rate_pct: float

class RegionSummaryItem(BaseModel):
    region: str
    pending_count: int
    overdue_count: int
    evc_scheduled: int
    avg_days: float
    high_risk_count: int

class OfficerWorkloadItem(BaseModel):
    id: str
    name: str
    email: str
    region: Optional[str] = None
    level: Optional[str] = None
    active_queue: int
    overdue_count: int
    avg_completion_days: float
