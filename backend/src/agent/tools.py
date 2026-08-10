"""Workspace-scoped CrewAI tools for the Emit log-chat agent.

Security model
--------------
Each tool binds a single ``workspace_id`` at construction time. The LLM can
never supply or override it — it is not part of any ``args_schema``. The bound
``workspace_id`` is forwarded into every ``get_storage_backend()`` call, exactly
the way ``routers/logs.py`` does for the REST path. Tenant isolation therefore
comes from the API key (resolved to a workspace upstream) and is enforced here
by construction, not by an LLM argument.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from crewai.tools import BaseTool

from storage_factory import get_storage_backend

# Cap how many rows a tool can ever pull into the agent's context. Keeps cost
# bounded and the LLM context small; the total count is always returned so the
# agent can report "N matches, showing the latest K".
_MAX_ROWS = 50


def _row(log: Dict[str, Any]) -> Dict[str, Any]:
    """Project a log row down to the compact fields the agent actually needs.

    ``id`` and the full metadata blob are dropped — they bloat the context for
    no analytical value and the agent must never echo opaque ids back.
    """
    return {
        "timestamp": log.get("timestamp"),
        "level": log.get("level"),
        "service": log.get("service"),
        "message": log.get("message"),
    }


class LogSearchInput(BaseModel):
    query: Optional[str] = Field(
        default=None,
        description="Text search over log message and service name.",
    )
    level: Optional[str] = Field(
        default=None,
        description="One of DEBUG, INFO, WARNING, ERROR, CRITICAL.",
    )
    service: Optional[str] = Field(
        default=None,
        description="Exact service name. Call list_services first if unsure.",
    )
    from_time: Optional[str] = Field(
        default=None, description="ISO-8601 start timestamp, inclusive."
    )
    to_time: Optional[str] = Field(
        default=None, description="ISO-8601 end timestamp, inclusive."
    )
    limit: int = Field(
        default=20,
        description="Maximum rows to return (capped at 50).",
        ge=1,
    )


class LogSearchTool(BaseTool):
    """Search the current workspace's logs by text, level, service, and time range.

    Returns the total match count plus the most recent matching logs. The
    workspace is fixed at construction and cannot be changed by the caller.
    """

    name: str = "search_logs"
    description: str = (
        "Search the current workspace's logs by text, level, service, and "
        "ISO-8601 time range. Returns the total match count plus the most "
        "recent matching logs."
    )
    args_schema: type[BaseModel] = LogSearchInput
    workspace_id: str

    def __init__(self, workspace_id: str) -> None:
        super().__init__(workspace_id=workspace_id)

    def _run(
        self,
        query: Optional[str] = None,
        level: Optional[str] = None,
        service: Optional[str] = None,
        from_time: Optional[str] = None,
        to_time: Optional[str] = None,
        limit: int = 20,
    ) -> str:
        try:
            size = min(max(limit, 1), _MAX_ROWS)
            result = get_storage_backend().query_logs(
                search=query,
                level=level,
                service=service,
                from_ts=from_time,
                to_ts=to_time,
                page=1,
                size=size,
                workspace_id=self.workspace_id,
            )
            logs: List[Dict[str, Any]] = result.get("logs", []) or []
            payload = {
                "total": result.get("total", 0),
                "returned": len(logs),
                "logs": [_row(log) for log in logs],
            }
            return json.dumps(payload, default=str)
        except Exception as exc:  # never raise into the agent loop
            return json.dumps({"error": f"search_logs failed: {exc}"})


class LogCountInput(BaseModel):
    level: Optional[str] = Field(
        default=None,
        description="One of DEBUG, INFO, WARNING, ERROR, CRITICAL.",
    )
    service: Optional[str] = Field(
        default=None,
        description="Exact service name. Call list_services first if unsure.",
    )
    from_time: Optional[str] = Field(
        default=None, description="ISO-8601 start timestamp, inclusive."
    )
    to_time: Optional[str] = Field(
        default=None, description="ISO-8601 end timestamp, inclusive."
    )


class LogCountTool(BaseTool):
    """Return only the total number of matching logs in this workspace."""

    name: str = "count_logs"
    description: str = (
        "Return only the total number of logs in the current workspace "
        "matching the filters. Use for how-many questions."
    )
    args_schema: type[BaseModel] = LogCountInput
    workspace_id: str

    def __init__(self, workspace_id: str) -> None:
        super().__init__(workspace_id=workspace_id)

    def _run(
        self,
        level: Optional[str] = None,
        service: Optional[str] = None,
        from_time: Optional[str] = None,
        to_time: Optional[str] = None,
    ) -> str:
        try:
            result = get_storage_backend().query_logs(
                search=None,
                level=level,
                service=service,
                from_ts=from_time,
                to_ts=to_time,
                page=1,
                size=1,
                workspace_id=self.workspace_id,
            )
            return json.dumps({"total": result.get("total", 0)})
        except Exception as exc:
            return json.dumps({"error": f"count_logs failed: {exc}"})


class ListServicesTool(BaseTool):
    """List distinct service names that have logs in this workspace."""

    name: str = "list_services"
    description: str = (
        "List distinct service names that have logs in the current workspace. "
        "Call before filtering by service when the exact name is unknown."
    )
    workspace_id: str

    def __init__(self, workspace_id: str) -> None:
        super().__init__(workspace_id=workspace_id)

    def _run(self) -> str:
        try:
            services = (
                get_storage_backend().get_unique_services(
                    workspace_id=self.workspace_id
                )
                or []
            )
            return json.dumps({"services": list(services)})
        except Exception as exc:
            return json.dumps({"error": f"list_services failed: {exc}"})
