import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class NotificationService:
    def send_verification_email(self, to_email: str, token: str, link_type: str = "signup") -> bool:
        """
        Sends an email containing an account or email change verification link.
        """
        verification_link = f"https://app.example.com/verify?token={token}&type={link_type}"
        logger.info("Sending %s verification email to %s via %s: link=%s", link_type, to_email, settings.SMTP_HOST, verification_link)
        return True

    def send_email_changed_alert(self, old_email: str, new_email: str) -> bool:
        """
        Security notice sent to the previous email address when an email change is initiated.
        """
        logger.info("Security alert: Email change from %s to %s requested", old_email, new_email)
        return True

notification_service = NotificationService()
