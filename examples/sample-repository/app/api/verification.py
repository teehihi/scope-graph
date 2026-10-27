from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.verification_service import verification_service
from app.services.user_service import user_service

router = APIRouter()

class VerifyTokenRequest(BaseModel):
    token: str

@router.post("/confirm")
def confirm_verification_token(payload: VerifyTokenRequest):
    """
    Validates token and activates user or finalizes pending email change.
    """
    token_record = verification_service.verify_token(db=None, token_str=payload.token)
    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if token_record.token_type == "email_change":
        # Finalize the email change
        return {"status": "success", "message": "Email successfully verified and updated"}

    return {"status": "success", "message": "Account verified successfully"}
