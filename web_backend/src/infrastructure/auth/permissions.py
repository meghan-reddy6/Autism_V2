ROLE_PERMISSIONS = {
    "RECEPTIONIST": [
        "create_patient",
        "view_patient",
        "create_assessment_session",
        "view_assessment_session",
        "view_assessment_template"
    ],
    "DOCTOR": [
        "create_patient",
        "view_patient",
        "create_assessment_session",
        "view_assessment_session",
        "update_assessment_session",
        "delete_assessment_session",
        "create_clinical_note",
        "view_clinical_note",
        "view_assessment_template",
        "view_report",
        "create_report",
        "update_report",
        "approve_report"
    ],
    "ORG_ADMIN": [
        "create_patient",
        "view_patient",
        "create_assessment_session",
        "view_assessment_session",
        "update_assessment_session",
        "delete_assessment_session",
        "create_clinical_note",
        "view_clinical_note",
        "view_assessment_template",
        "create_assessment_template",
        "update_assessment_template",
        "delete_assessment_template",
        "view_report",
        "create_report",
        "update_report",
        "approve_report",
        "manage_users",
        "manage_templates",
        "view_analytics"
    ],
    "SUPER_ADMIN": [
        "all"
    ]
}

def has_permission(user_role: str, required_permission: str) -> bool:
    """Check if a role has a specific permission"""
    role_str = str(user_role).replace("Role.", "")
    
    if role_str == "SUPER_ADMIN":
        return True
        
    permissions = ROLE_PERMISSIONS.get(role_str, [])
    
    if "all" in permissions:
        return True
        
    return required_permission in permissions
