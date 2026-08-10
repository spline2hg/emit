from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

Base = declarative_base()

class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    level = Column(String(20), nullable=False, index=True)
    service = Column(String(100), nullable=False, index=True)
    message = Column(Text, nullable=False)
    log_metadata = Column(JSON)

    workspace_id = Column(String, ForeignKey("workspaces.id"), index=True, nullable=False)
    workspace = relationship("Workspace", back_populates="logs")

    def __repr__(self):
        return f"<LogEntry {self.timestamp} {self.level} {self.service}>"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    oauth_token = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspaces = relationship("Workspace", back_populates="owner")

    def __repr__(self):
        return f"<User {self.username}>"

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    api_key_hash = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(String, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="workspaces")
    logs = relationship("LogEntry", back_populates="workspace")

    def __repr__(self):
        return f"<Workspace {self.name}>"


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )
    tool_calls = relationship(
        "ChatToolCall",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatToolCall.created_at",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    turn_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    session = relationship("ChatSession", back_populates="messages")


class ChatToolCall(Base):
    __tablename__ = "chat_tool_calls"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    turn_id = Column(String, nullable=True, index=True)
    tool_name = Column(String(100), nullable=False)
    arguments = Column(JSON, nullable=True)
    result = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="running")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    finished_at = Column(DateTime, nullable=True)

    session = relationship("ChatSession", back_populates="tool_calls")
