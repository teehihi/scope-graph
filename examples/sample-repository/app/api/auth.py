from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.services.user_service import user_service
from app.services.verification_service import verification_service
from app.core.security import verify_password, hash_password

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(payload: LoginRequest):
    # Dummy DB dependency for mock endpoint structure
    return {"token": "dummy-jwt-token", "token_type": "bearer"}

@router.post("/register")
def register(payload: RegisterRequest):
    # In real flow, creates user and sends verification
    return {"status": "created", "email": payload.email}
