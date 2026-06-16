import logging
import json
from datetime import datetime
from src.infrastructure.telemetry.request_context import get_tenant_id, get_user_id, get_trace_id

class StructuredJSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "trace_id": get_trace_id(),
            "tenant_id": get_tenant_id(),
            "user_id": get_user_id()
        }
        
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_obj)

def setup_structured_logging():
    logger = logging.getLogger()
    
    # Remove default handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJSONFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
