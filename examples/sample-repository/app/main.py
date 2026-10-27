"""
Sample Auth & User Service Repository
Demonstrates a multi-tier microservice architecture with API routing, service layer,
data models, and automated test coverage.
"""
from fastapi import FastAPI
from app.api import users, auth, verification

app = FastAPI(title="User & Auth Core Service", version="1.0.0")

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(verification.router, prefix="/api/v1/verification", tags=["verification"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
