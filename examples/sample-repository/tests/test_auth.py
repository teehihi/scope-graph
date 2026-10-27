from app.core.security import hash_password, verify_password

def test_password_hashing():
    pw = "mysecret123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("wrong", hashed) is False
