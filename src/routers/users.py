from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from db import get_db
from models import User
from schema import UserCreateResponse
from utils import generate_api_key, generate_philosopher_username

router = APIRouter()


@router.post("/users", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_user(db: Session = Depends(get_db)):
    """Create a new user."""
    try:
        username = generate_philosopher_username()
        api_key = generate_api_key()

        new_user = User(username=username, oauth_token=api_key)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return UserCreateResponse(
            id=str(new_user.id),
            username=new_user.username,
            api_key=api_key,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}",
        )


@router.get("/users/me")
async def get_current_user(
    oauth_token: str = Query(..., description="User's OAuth token"),
    db: Session = Depends(get_db),
):
    """Get the current user from their OAuth token."""
    user = db.query(User).filter(User.oauth_token == oauth_token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid OAuth token. User not found.",
        )
    return {
        "id": str(user.id),
        "username": user.username,
        "created_at": user.created_at.isoformat(),
    }
