import logging
from app.models.user import User
from app.services.verification_service import verification_service
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)

class UserService:
    def get_user_by_id(self, db, user_id: int) -> User | None:
        return db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, db, email: str) -> User | None:
        return db.query(User).filter(User.email == email).first()

    def update_user_email(self, db, user_id: int, new_email: str) -> User:
        """
        Legacy direct email update:
        Directly mutates user.email without requiring two-step verification.
        Target for refactoring to require email verification tokens.
        """
        user = self.get_user_by_id(db, user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        existing = self.get_user_by_email(db, new_email)
        if existing and existing.id != user_id:
            raise ValueError(f"Email {new_email} is already taken")

        old_email = user.email
        # Direct mutation without verification flow:
        user.email = new_email
        db.commit()
        db.refresh(user)

        notification_service.send_email_changed_alert(old_email, new_email)
        return user

    def request_email_change(self, db, user_id: int, new_email: str):
        """
        Proposed verification flow:
        Stores new_email in pending_email or creates an email_change verification token.
        """
        user = self.get_user_by_id(db, user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        return verification_service.create_verification_token(
            db=db,
            user_id=user.id,
            token_type="email_change",
            new_email=new_email
        )

user_service = UserService()
