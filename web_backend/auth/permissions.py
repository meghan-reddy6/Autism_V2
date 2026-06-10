ROLE_PERMISSIONS = {
    "DATA_ENTRY": [
        "create_patient", 
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session",
        "view_assessment_template"
    ],
    "ASSESSOR": [
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session",
        "update_assessment_session",
        "create_clinical_note",
        "view_assessment_template"
    ],
    "THERAPIST": [
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session",
        "update_assessment_session",
        "create_clinical_note",
        "view_assessment_template"
    ],
    "SUPERVISOR": [
        "create_patient",
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session",
        "update_assessment_session",
        "delete_assessment_session",
        "create_clinical_note", 
        "approve_report",
        "update_report",
        "view_assessment_template"
    ],
    "CLINICAL_ADMIN": [
        "create_patient",
        "view_patient", 
        "create_assessment_session",
        "view_assessment_session",
        "update_assessment_session",
        "delete_assessment_session",
        "create_clinical_note", 
        "approve_report",
        "update_report",
        "view_assessment_template",
        "create_assessment_template",
        "update_assessment_template",
        "delete_assessment_template"
    ],
    "TENANT_ADMIN": [
        "create_patient",
        "view_patient",
        "create_assessment_session",
        "view_assessment_session",
        "update_assessment_session",
        "delete_assessment_session",
        "create_clinical_note",
        "approve_report",
        "update_report",
        "view_assessment_template",
        "create_assessment_template",
        "update_assessment_template",
        "delete_assessment_template",
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
    
    # Legacy mappings mapping
    legacy_map = {
        "DOCTOR": "CLINICAL_ADMIN",
        "CLINIC_ADMIN": "TENANT_ADMIN",
        "PSYCHOLOGIST": "SUPERVISOR",
        "RECEPTIONIST": "DATA_ENTRY",
        "PATIENT_PARENT": "VIEWER"
    }
    role_str = legacy_map.get(role_str, role_str)
    
    if role_str == "SUPER_ADMIN":
        return True
        
    permissions = ROLE_PERMISSIONS.get(role_str, [])
    
    if "all" in permissions:
        return True
        
    return required_permission in permissions
