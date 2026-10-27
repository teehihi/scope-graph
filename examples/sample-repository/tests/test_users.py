import pytest
from app.services.user_service import user_service
from app.models.user import User

def test_update_user_email_direct():
    """
    Tests the legacy direct update behavior.
    """
    class MockDB:
        def __init__(self):
            self.user = User(id=1, email="old@example.com")
        def query(self, model):
            return self
        def filter(self, condition):
            return self
        def first(self):
            return self.user
        def commit(self):
            pass
        def refresh(self, obj):
            pass

    mock_db = MockDB()
    updated = user_service.update_user_email(mock_db, user_id=1, new_email="new@example.com")
    assert updated.email == "new@example.com"
