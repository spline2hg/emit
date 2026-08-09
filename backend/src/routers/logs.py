from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from config import Config
from storage_factory import get_storage_backend
from utils import verify_api_key

router = APIRouter()

CONFIGURED_BACKENDS = {"sqlite", "elasticsearch", "s3"}


def resolve_backend(requested_backend: Optional[str]) -> str:
    configured_backend = Config.STORAGE_BACKEND.lower()
    if configured_backend not in CONFIGURED_BACKENDS:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid configured storage backend: {configured_backend}",
        )

    if requested_backend and requested_backend.lower() != configured_backend:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Storage backend '{requested_backend}' is not configured. "
                f"Configured backend: '{configured_backend}'."
            ),
        )

    return configured_backend


@router.get("/logs/backends")
def get_configured_backends(auth_info: dict = Depends(verify_api_key)):
    """Return storage backends configured for this deployment."""
    configured_backend = resolve_backend(None)
    return {
        "backends": [configured_backend],
        "default_backend": configured_backend,
    }


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
    """Query logs belonging only to the workspace in the API key."""
    try:
        storage = get_storage_backend(backend_name=resolve_backend(backend))
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
    except HTTPException:
        raise
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
    """List services belonging only to the workspace in the API key."""
    try:
        storage = get_storage_backend(backend_name=resolve_backend(backend))
        return {
            "services": storage.get_unique_services(
                workspace_id=auth_info["workspace_id"]
            ),
            "workspace_id": auth_info["workspace_id"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get services: {str(e)}",
        )
