from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from storage_factory import get_storage_backend
from utils import verify_api_key

router = APIRouter()


@router.get("/logs")
async def get_logs(
    search: Optional[str] = Query(None, description="Text search query"),
    level: Optional[str] = Query(
        None, pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL|ALL)$"
    ),
    service: Optional[str] = Query(None, description="Filter by service name"),
    backend: Optional[str] = Query(
        None, pattern="^(sqlite|elasticsearch|s3)$"
    ),
    from_ts: Optional[str] = Query(None, description="Start timestamp ISO 8601"),
    to_ts: Optional[str] = Query(None, description="End timestamp ISO 8601"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    auth_info: dict = Depends(verify_api_key),
):
    """Query logs belonging only to the workspace in the workspace key."""
    try:
        storage = get_storage_backend(backend_name=backend)
        result = storage.query_logs(
            search=search,
            level=level,
            service=service,
            from_ts=from_ts,
            to_ts=to_ts,
            page=page,
            size=size,
            workspace_id=auth_info["workspace_id"],
        )
        return {
            "logs": result.get("logs", []),
            "total": result.get("total", 0),
            "page": result.get("page", page),
            "size": result.get("size", size),
            "total_pages": result.get("total_pages", 0),
            "workspace_id": auth_info["workspace_id"],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query logs: {str(e)}",
        )


@router.get("/logs/services")
def get_services(
    backend: Optional[str] = Query(
        None, pattern="^(sqlite|elasticsearch|s3)$"
    ),
    auth_info: dict = Depends(verify_api_key),
):
    """List services belonging only to the workspace in the workspace key."""
    try:
        storage = get_storage_backend(backend_name=backend)
        return {
            "services": storage.get_unique_services(
                workspace_id=auth_info["workspace_id"]
            ),
            "workspace_id": auth_info["workspace_id"],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get services: {str(e)}",
        )
