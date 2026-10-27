from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.services.user_service import user_service

router = APIRouter()

class UpdateEmailRequest(BaseModel):
    new_email: EmailStr

class UserProfileResponse(BaseModel):
    id: int
    email: str
    is_verified: bool

@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile():
    return UserProfileResponse(id=1, email="alice@example.com", is_verified=True)

@router.patch("/me/email")
def update_current_user_email(payload: UpdateEmailRequest):
    """
    Endpoint that currently changes user email immediately.
    Target of change: Refactor to require confirmation before email update.
    """
    try:
        # In actual service this invokes user_service.update_user_email
        updated_user = user_service.update_user_email(db=None, user_id=1, new_email=payload.new_email)
        return {"status": "success", "message": "Email updated successfully", "email": updated_user.email}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
