import datetime
from app.services.verification_service import verification_service
from app.models.verification_token import VerificationToken

def test_token_verification_expired():
    class MockDB:
        def query(self, model):
            return self
        def filter(self, *conditions):
            return self
        def first(self):
            # Expired token
            return VerificationToken(
                id=1,
                user_id=1,
                token="expired_token",
                token_type="email_change",
                expires_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1),
                is_used=False
            )

    result = verification_service.verify_token(MockDB(), "expired_token")
    assert result is None
