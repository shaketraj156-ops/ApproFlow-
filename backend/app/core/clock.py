from datetime import datetime, timezone
from typing import Optional


def utcnow() -> datetime:
    """Timezone-aware UTC now. DB columns are timestamptz, so naive datetimes cannot be compared with them."""
    return datetime.now(timezone.utc)


def as_utc(value: Optional[datetime]) -> Optional[datetime]:
    """Treat a naive datetime as UTC. Postgres returns aware values; this keeps other backends (tests) consistent."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value
