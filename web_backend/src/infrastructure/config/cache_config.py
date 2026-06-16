from enum import Enum
from pydantic import BaseModel

class CacheConsistencyLevel(str, Enum):
    STRONG = "STRONG"      # Critical clinical data. No caching allowed. Direct DB hits.
    EVENTUAL = "EVENTUAL"  # Dashboard aggregates, analytics. Strict Domain Event invalidation.
    SOFT = "SOFT"          # UI Templates, static reference data. Time-based expiration, occasional manual invalidation.

class CacheConfig(BaseModel):
    consistency_level: CacheConsistencyLevel
    default_ttl: int
