from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, ForeignKey
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
    
    project_id = Column(String, ForeignKey("projects.id"), index=True, nullable=False)
    project = relationship("Project", back_populates="logs")


  
    def __repr__(self):
        return f"<LogEntry {self.timestamp} {self.level} {self.service}>"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    oauth_token = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to projects
    projects = relationship("Project", back_populates="owner")

    def __repr__(self):
        return f"<User {self.username}>"

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    api_key_hash = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Foreign key to user
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)

    # Relationship to user
    owner = relationship("User", back_populates="projects")
    logs = relationship("LogEntry", back_populates="project")


    def __repr__(self):
        return f"<Project {self.name}>"