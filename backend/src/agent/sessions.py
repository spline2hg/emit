"""SQLite-backed, workspace/user-scoped conversation history and tool traces."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, List

from db import SessionLocal
from models import ChatMessage, ChatSession, ChatToolCall

# Only the most recent turns are sent to the LLM. Older messages remain stored
# so the chat history survives restarts and can be displayed later.
MAX_MESSAGES = 12


class SessionOwnershipError(Exception):
    """Raised when a session id belongs to another owner or workspace."""


class SessionStore:
    """Persist chat sessions while enforcing owner/workspace isolation."""

    def _get_session(self, db, session_id: str) -> ChatSession | None:
        return (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id)
            .first()
        )

    @staticmethod
    def _assert_owner(
        session: ChatSession,
        workspace_id: str,
        owner_id: str,
    ) -> None:
        if (
            session.workspace_id != workspace_id
            or session.owner_id != owner_id
        ):
            raise SessionOwnershipError("Chat session does not belong to this user")

    def get(
        self,
        session_id: str,
        workspace_id: str,
        owner_id: str,
    ) -> List[dict]:
        """Return the latest user/assistant window for an authorized session."""
        db = SessionLocal()
        try:
            session = self._get_session(db, session_id)
            if session is None:
                return []
            self._assert_owner(session, workspace_id, owner_id)

            messages = (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
                .limit(MAX_MESSAGES)
                .all()
            )
            messages.reverse()
            return [
                {"role": message.role, "content": message.content}
                for message in messages
                if message.role in {"user", "assistant"}
            ]
        finally:
            db.close()

    def list_sessions(self, workspace_id: str, owner_id: str) -> list[dict]:
        db = SessionLocal()
        try:
            sessions = (
                db.query(ChatSession)
                .filter(
                    ChatSession.workspace_id == workspace_id,
                    ChatSession.owner_id == owner_id,
                )
                .order_by(ChatSession.updated_at.desc())
                .all()
            )
            result = []
            for session in sessions:
                first_message = (
                    db.query(ChatMessage)
                    .filter(
                        ChatMessage.session_id == session.id,
                        ChatMessage.role == "user",
                    )
                    .order_by(ChatMessage.created_at.asc())
                    .first()
                )
                result.append(
                    {
                        "id": session.id,
                        "title": (
                            first_message.content[:80]
                            if first_message
                            else "New conversation"
                        ),
                        "updated_at": session.updated_at,
                    }
                )
            return result
        finally:
            db.close()

    def transcript(
        self,
        session_id: str,
        workspace_id: str,
        owner_id: str,
    ) -> dict:
        db = SessionLocal()
        try:
            session = self._get_session(db, session_id)
            if session is None:
                raise SessionOwnershipError("Chat session was not found")
            self._assert_owner(session, workspace_id, owner_id)

            messages = (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
                .all()
            )
            tool_calls = (
                db.query(ChatToolCall)
                .filter(ChatToolCall.session_id == session_id)
                .order_by(ChatToolCall.created_at.asc(), ChatToolCall.id.asc())
                .all()
            )
            return {
                "session_id": session.id,
                "messages": [
                    {
                        "id": message.id,
                        "role": message.role,
                        "content": message.content,
                        "turn_id": message.turn_id,
                        "created_at": message.created_at,
                    }
                    for message in messages
                ],
                "tool_calls": [
                    {
                        "id": tool.id,
                        "turn_id": tool.turn_id,
                        "tool_name": tool.tool_name,
                        "arguments": tool.arguments,
                        "result": tool.result,
                        "status": tool.status,
                        "created_at": tool.created_at,
                        "finished_at": tool.finished_at,
                    }
                    for tool in tool_calls
                ],
            }
        finally:
            db.close()

    def append(
        self,
        session_id: str,
        workspace_id: str,
        owner_id: str,
        message: dict,
        turn_id: str | None = None,
    ) -> None:
        """Append a message, creating the scoped session when necessary."""
        db = SessionLocal()
        try:
            session = self._get_session(db, session_id)
            if session is None:
                session = ChatSession(
                    id=session_id,
                    workspace_id=workspace_id,
                    owner_id=owner_id,
                )
                db.add(session)
                db.flush()
            else:
                self._assert_owner(session, workspace_id, owner_id)

            db.add(
                ChatMessage(
                    session_id=session.id,
                    role=str(message.get("role", "user")),
                    content=str(message.get("content", "")),
                    turn_id=turn_id,
                )
            )
            session.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def start_tool_call(
        self,
        session_id: str,
        workspace_id: str,
        owner_id: str,
        tool: dict[str, Any],
        turn_id: str | None = None,
    ) -> None:
        db = SessionLocal()
        try:
            session = self._get_session(db, session_id)
            if session is None:
                raise SessionOwnershipError("Chat session was not found")
            self._assert_owner(session, workspace_id, owner_id)

            call_id = str(tool.get("call_id") or "")
            if not call_id or db.get(ChatToolCall, call_id):
                return

            arguments = tool.get("arguments")
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError:
                    arguments = {"raw": arguments}

            db.add(
                ChatToolCall(
                    id=call_id,
                    session_id=session_id,
                    turn_id=turn_id,
                    tool_name=str(tool.get("name", "tool")),
                    arguments=arguments,
                    status="running",
                )
            )
            session.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def finish_tool_call(
        self,
        session_id: str,
        workspace_id: str,
        owner_id: str,
        tool: dict[str, Any],
        turn_id: str | None = None,
    ) -> None:
        db = SessionLocal()
        try:
            session = self._get_session(db, session_id)
            if session is None:
                raise SessionOwnershipError("Chat session was not found")
            self._assert_owner(session, workspace_id, owner_id)

            call_id = str(tool.get("call_id") or "")
            call = db.get(ChatToolCall, call_id) if call_id else None
            if call is not None and call.session_id != session_id:
                return
            if call is None:
                if not call_id:
                    return
                arguments = tool.get("arguments")
                if isinstance(arguments, str):
                    try:
                        arguments = json.loads(arguments)
                    except json.JSONDecodeError:
                        arguments = {"raw": arguments}
                call = ChatToolCall(
                    id=call_id,
                    session_id=session_id,
                    turn_id=turn_id,
                    tool_name=str(tool.get("name", "tool")),
                    arguments=arguments,
                    status="running",
                )
                db.add(call)

            result = tool.get("result")
            if not isinstance(result, str):
                result = json.dumps(result, default=str)
            call.result = result
            call.status = "completed"
            call.finished_at = datetime.utcnow()
            session.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


sessions = SessionStore()
