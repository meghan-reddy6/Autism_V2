ROLE_PERMISSIONS = {
    "DATA_ENTRY": [
        "create_patient", 
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session"
    ],
    "ASSESSOR": [
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session",
        "create_clinical_note"
    ],
    "THERAPIST": [
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session",
        "create_clinical_note"
    ],
    "SUPERVISOR": [
        "create_patient",
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session",
        "create_clinical_note", 
        "approve_report"
    ],
    "CLINICAL_ADMIN": [
        "create_patient",
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session",
        "create_clinical_note", 
        "approve_report"
    ],
    "TENANT_ADMIN": [
        "create_patient",
        "view_patient",
        "create_assessment_session",
        "view_assessment_session",
        "create_clinical_note",
        "manage_users", 
        "manage_templates", 
        "view_analytics"
    ],
    "PLATFORM_ADMIN": [
        "all"
    ],
    "SUPER_ADMIN": [
        "all"
    ],
    "VIEWER": [
        "view_patient"
    ]
}

def has_permission(user_role: str, required_permission: str) -> bool:
    """Check if a role has a specific permission"""
    # Prisma enums might come in as "Role.DOCTOR", normalize it
    role_str = str(user_role).replace("Role.", "")
    
    if role_str == "SUPER_ADMIN":
        return True
        
    permissions = ROLE_PERMISSIONS.get(role_str, [])
    
    if "all" in permissions:
        return True
        
    return required_permission in permissions
