from pydantic import BaseModel, Field, validator
# import datetime
from datetime import datetime

from typing import Optional, Dict, Any

class LogIngestRequest(BaseModel):
    """Model for log ingestion request"""
    message: str
    level: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    service: str = Field(default="default-service", max_length=100)
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @validator('timestamp', pre=True)
    def parse_timestamp(cls, v):
        if v is None:
            return datetime.utcnow().isoformat()
        try:
            # Try to parse the timestamp
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError("Invalid timestamp format. Use ISO 8601 format.")


class UserCreateResponse(BaseModel):
    """Response model for user creation"""
    id: str
    username: str
    api_key: str


class ProjectCreateRequest(BaseModel):
    """Request model for project creation"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    oauth_token: str = Field(..., min_length=1, description="OAuth token for the user")


class ProjectCreateResponse(BaseModel):
    """Response model for project creation"""
    id: str
    name: str
    description: Optional[str]
    api_key: str
    owner_id: str
    created_at: datetime
