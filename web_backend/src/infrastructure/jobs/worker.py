import os
import resend
import logging
from arq.connections import RedisSettings
from src.infrastructure.config.logging_config import setup_structured_logging

setup_structured_logging()
logger = logging.getLogger("worker")

resend.api_key = os.getenv("RESEND_API_KEY", "re_mock_key")

async def send_email_job(ctx, to_email: str, subject: str, html_content: str, trace_id: str = None):
    from src.infrastructure.telemetry.request_context import current_trace_id
    current_trace_id.set(trace_id)
    
    logger.info(f"Worker processing email to {to_email}")
    if resend.api_key == "re_mock_key":
        logger.info(f"MOCK RESEND: Sending email to {to_email}")
        logger.info(f"Subject: {subject}")
        return {"status": "mocked", "id": "mock_email_id"}
        
    try:
        r = resend.Emails.send({
            "from": "Autism Clinic <onboarding@resend.dev>",
            "to": to_email,
            "subject": subject,
            "html": html_content
        })
        logger.info(f"Email sent successfully to {to_email}. Resend ID: {r.get('id')}")
        return r
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise e  # arq will retry automatically on failure

class WorkerSettings:
    functions = [send_email_job]
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    max_tries = 3  # Exponential backoff built into arq
