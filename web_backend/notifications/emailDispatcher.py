import logging

logger = logging.getLogger(__name__)

async def send_assessment_link(patient_email: str, patient_name: str, assessment_token: str, clinic_name: str = "Autism Assessment Clinic"):
    """
    Mock email service for sending assessment links.
    In a production environment, this would integrate with SendGrid, AWS SES, etc.
    """
    subject = f"Your Assessment Link from {clinic_name}"
    link = f"http://localhost:3000/assessment/{assessment_token}"
    
    body = f"""
    Dear {patient_name},
    
    You have been assigned a new assessment by {clinic_name}.
    Please click the link below to access your secure assessment portal:
    
    {link}
    
    This link is unique to you. Please do not share it.
    
    Regards,
    {clinic_name} Team
    """
    
    logger.info(f"--- MOCK EMAIL DISPATCHED ---")
    logger.info(f"To: {patient_email}")
    logger.info(f"Subject: {subject}")
    logger.info(f"Body: \n{body}")
    logger.info(f"-----------------------------")
    
    return True
