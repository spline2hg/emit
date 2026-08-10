"""SSE streaming ``/chat`` endpoint for the Emit log-chat agent.

Auth uses the existing ``verify_api_key`` dependency (same as ``logs.py``), so
the workspace is resolved from the ``X-API-Key`` header exactly as everywhere
else. The agent is disabled gracefully when ``LLM_API_KEY`` is unset (503).
"""

from __future__ import annotations

import asyncio
import json
import queue
import threading
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from crewai.events import crewai_event_bus

from config import Config
from agent.crew import build_log_crew
from agent.sessions import SessionOwnershipError, sessions
from agent.streaming import bridge
from utils import verify_api_key

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: str | None = None


def _final_text(result) -> str:
    """Extract the crew's final answer text across CrewAI result shapes."""
    raw = getattr(result, "raw", None)
    if raw:
        return str(raw)
    tasks_output = getattr(result, "tasks_output", None)
    if tasks_output:
        last = tasks_output[-1]
        last_raw = getattr(last, "raw", None)
        if last_raw:
            return str(last_raw)
    return str(result)


@router.get("/chat/sessions")
def list_chat_sessions(auth_info: dict = Depends(verify_api_key)):
    return {
        "sessions": sessions.list_sessions(
            auth_info["workspace_id"],
            auth_info["owner_id"],
        )
    }


@router.get("/chat/sessions/{session_id}")
def get_chat_session(
    session_id: str,
    auth_info: dict = Depends(verify_api_key),
):
    try:
        return sessions.transcript(
            session_id,
            auth_info["workspace_id"],
            auth_info["owner_id"],
        )
    except SessionOwnershipError as exc:
        raise HTTPException(status_code=404, detail="Chat session not found") from exc


def _crew_identifiers(crew) -> set[str]:  # type: ignore[no-untyped-def]
    """Collect identifiers emitted by this crew's event stream."""
    identifiers: set[str] = set()
    fingerprint = getattr(crew, "fingerprint", None)
    fingerprint_id = getattr(fingerprint, "uuid_str", fingerprint)
    if fingerprint_id:
        identifiers.add(str(fingerprint_id))

    for item in [*getattr(crew, "tasks", []), *getattr(crew, "agents", [])]:
        item_id = getattr(item, "id", None)
        if item_id:
            identifiers.add(str(item_id))

    return identifiers


@router.post("/chat")
async def chat(req: ChatRequest, auth_info: dict = Depends(verify_api_key)):
    if not Config.LLM_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Chat is not configured (LLM_API_KEY missing)",
        )

    workspace_id = auth_info["workspace_id"]
    owner_id = auth_info["owner_id"]
    session_id = req.session_id or str(uuid4())
    turn_id = str(uuid4())

    # The API key resolves both the workspace and its owner. A client-supplied
    # session id is accepted only when it belongs to that same pair.
    try:
        sessions.append(
            session_id,
            workspace_id,
            owner_id,
            {"role": "user", "content": req.message},
            turn_id=turn_id,
        )
        history = sessions.get(session_id, workspace_id, owner_id)
    except SessionOwnershipError as exc:
        raise HTTPException(
            status_code=403,
            detail="Chat session does not belong to this user",
        ) from exc

    # The current user message is already stored. Pass only prior turns to the
    # prompt because the new question is provided separately by the crew.
    crew = build_log_crew(workspace_id, req.message, history[:-1])

    q: queue.Queue = queue.Queue()

    def persist_event(kind: str, payload) -> None:  # type: ignore[no-untyped-def]
        if not isinstance(payload, dict):
            return
        if kind == "tool_start":
            sessions.start_tool_call(
                session_id,
                workspace_id,
                owner_id,
                payload,
                turn_id=turn_id,
            )
        elif kind == "tool_end":
            sessions.finish_tool_call(
                session_id,
                workspace_id,
                owner_id,
                payload,
                turn_id=turn_id,
            )

    channel_id = bridge.register(
        q,
        _crew_identifiers(crew),
        on_event=persist_event,
    )

    def run() -> None:
        try:
            result = crew.kickoff()
            # CrewAI dispatches non-stream events on its executor. Flush them
            # before sending the final answer so tool_start/tool_end frames
            # cannot arrive after the SSE sentinel.
            crewai_event_bus.flush(timeout=5)
            text = _final_text(result)
            sessions.append(
                session_id,
                workspace_id,
                owner_id,
                {"role": "assistant", "content": text},
                turn_id=turn_id,
            )
            q.put(("answer", text))
        except Exception as exc:  # surfaced as an error frame, then stream ends
            q.put(("error", str(exc)))
        finally:
            q.put(None)  # sentinel: stream complete

    threading.Thread(target=run, daemon=True).start()

    async def event_stream():
        try:
            while True:
                # q is filled by a daemon thread; get() blocks, so offload it
                # to a worker thread to avoid stalling the event loop.
                item = await asyncio.to_thread(q.get)
                if item is None:  # sentinel
                    break
                kind, payload = item
                yield "data: " + json.dumps(
                    {
                        "type": kind,
                        "content": payload,
                        "session_id": session_id,
                    },
                    default=str,
                ) + "\n\n"
        finally:
            bridge.unregister(channel_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
