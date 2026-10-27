import datetime
import secrets
from app.core.config import settings
from app.models.verification_token import VerificationToken
from app.services.notification_service import notification_service

class VerificationService:
    def create_verification_token(self, db, user_id: int, token_type: str, new_email: str | None = None) -> VerificationToken:
        token_str = secrets.token_urlsafe(32)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)
        record = VerificationToken(
            user_id=user_id,
            token=token_str,
            token_type=token_type,
            new_email=new_email,
            expires_at=expires_at,
            is_used=False
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        # Notify via email
        target_email = new_email if new_email else "user@example.com"
        notification_service.send_verification_email(to_email=target_email, token=token_str, link_type=token_type)
        return record

    def verify_token(self, db, token_str: str) -> VerificationToken | None:
        token_rec = db.query(VerificationToken).filter(
            VerificationToken.token == token_str,
            VerificationToken.is_used == False
        ).first()

        if not token_rec:
            return None
        if token_rec.expires_at < datetime.datetime.utcnow():
            return None
        return token_rec

verification_service = VerificationService()
