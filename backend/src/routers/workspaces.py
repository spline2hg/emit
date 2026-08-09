from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from db import get_db
from models import Workspace, User
from schema import WorkspaceCreateRequest, WorkspaceCreateResponse
from utils import generate_api_key

router = APIRouter(prefix="/workspaces")


@router.post("", response_model=WorkspaceCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreateRequest,
    db: Session = Depends(get_db),
):
    """Create a new workspace for a user."""
    try:
        user = db.query(User).filter(
            User.oauth_token == workspace_data.oauth_token
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid OAuth token. User not found.",
            )

        api_key = generate_api_key()
        api_key_hash = sha256(api_key.encode()).hexdigest()

        new_workspace = Workspace(
            name=workspace_data.name,
            description=workspace_data.description,
            api_key_hash=api_key_hash,
            owner_id=str(user.id),
        )
        db.add(new_workspace)
        db.commit()
        db.refresh(new_workspace)

        return WorkspaceCreateResponse(
            id=str(new_workspace.id),
            name=new_workspace.name,
            description=new_workspace.description,
            api_key=api_key,
            owner_id=str(new_workspace.owner_id),
            created_at=new_workspace.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create workspace: {str(e)}",
        )


@router.get("", status_code=status.HTTP_200_OK)
async def list_workspaces(
    oauth_token: str = Query(..., description="User's OAuth token"),
    db: Session = Depends(get_db),
):
    """List all workspaces for a user."""
    try:
        user = db.query(User).filter(User.oauth_token == oauth_token).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid OAuth token. User not found.",
            )

        workspaces = (
            db.query(Workspace).filter(Workspace.owner_id == str(user.id)).all()
        )

        return {
            "workspaces": [
                {
                    "id": str(ws.id),
                    "name": ws.name,
                    "description": ws.description,
                    "created_at": ws.created_at.isoformat(),
                }
                for ws in workspaces
            ],
            "total": len(workspaces),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list workspaces: {str(e)}",
        )


@router.get("/{workspace_id}/api-key", status_code=status.HTTP_200_OK)
async def get_workspace_api_key(
    workspace_id: str,
    oauth_token: str = Query(..., description="User's OAuth token"),
    db: Session = Depends(get_db),
):
    """Regenerate the API key for a workspace."""
    try:
        user = db.query(User).filter(User.oauth_token == oauth_token).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid OAuth token. User not found.",
            )

        workspace = (
            db.query(Workspace)
            .filter(Workspace.id == workspace_id, Workspace.owner_id == str(user.id))
            .first()
        )
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found.",
            )

        api_key = generate_api_key()
        workspace.api_key_hash = sha256(api_key.encode()).hexdigest()
        db.commit()

        return {
            "workspace_id": str(workspace.id),
            "api_key": api_key,
            "message": "New API key generated. Previous key has been invalidated.",
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate API key: {str(e)}",
        )
