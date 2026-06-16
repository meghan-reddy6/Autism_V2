import pytest
from src.services.assessment_workflow import validate_assessment_session_transition, validate_report_transition

def test_assessment_session_transitions():
    # Valid transitions
    assert validate_assessment_session_transition("CREATED", "SENT") is True
    assert validate_assessment_session_transition("SUBMITTED", "UNDER_REVIEW") is True
    assert validate_assessment_session_transition("UNDER_REVIEW", "APPROVED") is True
    assert validate_assessment_session_transition("UNDER_REVIEW", "REJECTED") is True

    # Invalid transitions
    assert validate_assessment_session_transition("CREATED", "APPROVED") is False
    assert validate_assessment_session_transition("APPROVED", "UNDER_REVIEW") is False # Immutability check
    assert validate_assessment_session_transition("ARCHIVED", "CREATED") is False

def test_report_transitions():
    # Valid transitions
    assert validate_report_transition("DRAFT", "AI_GENERATED") is True
    assert validate_report_transition("AI_GENERATED", "PENDING_REVIEW") is True
    assert validate_report_transition("AI_GENERATED", "APPROVED") is True # Allowed per recent fix
    assert validate_report_transition("PENDING_REVIEW", "APPROVED") is True

    # Invalid transitions
    assert validate_report_transition("APPROVED", "DRAFT") is False # Immutability check
    assert validate_report_transition("DRAFT", "APPROVED") is False
    assert validate_report_transition("ARCHIVED", "DRAFT") is False
