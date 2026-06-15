import hashlib
from typing import Dict, Any, Optional

class CacheKeyBuilder:
    @staticmethod
    def build_dashboard_stats_key(tenant_id: str, filters: Optional[Dict[str, Any]] = None) -> str:
        base_key = f"tenant:{tenant_id}:v1:dashboard:stats"
        if not filters:
            return f"{base_key}:default"
        
        # Sort keys to ensure consistent hashing
        filter_str = str(sorted(filters.items()))
        filter_hash = hashlib.md5(filter_str.encode()).hexdigest()
        return f"{base_key}:{filter_hash}"

    @staticmethod
    def build_public_template_key(token: str) -> str:
        return f"public:v1:assessment_template:{token}"
        
    @staticmethod
    def get_dashboard_invalidation_pattern(tenant_id: str) -> str:
        return f"tenant:{tenant_id}:v1:dashboard:stats:*"
