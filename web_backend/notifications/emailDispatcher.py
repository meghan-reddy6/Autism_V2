import logging
import os
from arq import create_pool
from arq.connections import RedisSettings
from infrastructure.context import get_trace_id

logger = logging.getLogger(__name__)

redis_pool = None

async def get_redis_pool():
    global redis_pool
    if not redis_pool:
        redis_pool = await create_pool(RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379/0")))
    return redis_pool

async def send_assessment_link(patient_email: str, patient_name: str, assessment_token: str, clinic_name: str = "Autism Assessment Clinic"):
    subject = f"Your Assessment Link from {clinic_name}"
    link = f"http://localhost:3000/assessment/{assessment_token}"
    
    html_content = f"""
    <p>Dear {patient_name},</p>
    <p>You have been assigned a new assessment by {clinic_name}.</p>
    <p>Please click the link below to access your secure assessment portal:</p>
    <p><a href="{link}">{link}</a></p>
    <p>This link is unique to you. Please do not share it.</p>
    <p>Regards,<br>{clinic_name} Team</p>
    """
    
    pool = await get_redis_pool()
    await pool.enqueue_job('send_email_job', patient_email, subject, html_content, get_trace_id())
    logger.info(f"Enqueued email job to {patient_email}")
    return True
