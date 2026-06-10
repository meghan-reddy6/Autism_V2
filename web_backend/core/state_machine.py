from typing import Set, Dict

# AssessmentSession valid transitions
SESSION_TRANSITIONS: Dict[str, Set[str]] = {
    "CREATED": {"SENT", "CANCELLED"},
    "SENT": {"IN_PROGRESS", "EXPIRED", "CANCELLED"},
    "IN_PROGRESS": {"SUBMITTED", "EXPIRED", "CANCELLED"},
    "SUBMITTED": {"UNDER_REVIEW", "CANCELLED"},
    "UNDER_REVIEW": {"APPROVED", "REJECTED", "CANCELLED"},
    "REJECTED": {"CANCELLED", "SENT"}, # Assuming a rejected session might be resent or cancelled
    "APPROVED": {"ARCHIVED"},
    "CANCELLED": set(), # Terminal
    "EXPIRED": set(),   # Terminal
    "ARCHIVED": set()   # Terminal
}

def validate_assessment_session_transition(current_state: str, next_state: str) -> bool:
    """
    Returns True if the transition is allowed, False otherwise.
    """
    allowed_next = SESSION_TRANSITIONS.get(current_state)
    if allowed_next is None:
        return False
    return next_state in allowed_next


# Report valid transitions
REPORT_TRANSITIONS: Dict[str, Set[str]] = {
    "DRAFT": {"AI_GENERATED"},
    "AI_GENERATED": {"PENDING_REVIEW", "APPROVED", "REJECTED"},
    "PENDING_REVIEW": {"APPROVED", "REJECTED"},
    "REJECTED": {"PENDING_REVIEW"}, # Might be updated and resubmitted
    "APPROVED": {"ARCHIVED"},
    "ARCHIVED": set() # Terminal
}

def validate_report_transition(current_state: str, next_state: str) -> bool:
    """
    Returns True if the transition is allowed, False otherwise.
    """
    allowed_next = REPORT_TRANSITIONS.get(current_state)
    if allowed_next is None:
        return False
    return next_state in allowed_next
