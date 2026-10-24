from typing import Dict, Any, Optional

class AICTEPortalAdapter:
    """Adapter interface and mock implementation for the AICTE National Portal."""
    
    def fetch_institution_details(self, institution_code: str) -> Optional[Dict[str, Any]]:
        # Mock adapter data
        return {
            "code": institution_code,
            "aicte_id": f"1-{institution_code}",
            "status": "APPROVED",
            "trust_name": f"Educational Trust for {institution_code}",
            "is_valid": True
        }

    def sync_approval_decision(self, application_number: str, decision: str) -> bool:
        # Mock sync to external portal
        return True

aicte_portal_client = AICTEPortalAdapter()
