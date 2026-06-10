import contextvars
from typing import Optional

# These context variables will store context for the lifetime of a single ASGI request
current_tenant_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_tenant_id", default=None)
current_user_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_user_id", default=None)
current_user_role: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_user_role", default=None)
current_ip_address: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_ip_address", default=None)

def get_tenant_id() -> Optional[str]:
    return current_tenant_id.get()

def get_user_role() -> Optional[str]:
    return current_user_role.get()

def get_user_id() -> Optional[str]:
    return current_user_id.get()

def get_ip_address() -> Optional[str]:
    return current_ip_address.get()
