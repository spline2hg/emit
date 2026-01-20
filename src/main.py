from fastapi import FastAPI, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from models import Base, LogEntry, User, Project
from db import engine, get_db
from schema import LogIngestRequest, UserCreateResponse, ProjectCreateRequest, ProjectCreateResponse
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import List, Optional
import json
import random
import string
import secrets
from kafka_producer import get_kafka_producer
from utils import *
from hashlib import sha256

app = FastAPI(title="Mini Log Pipeline")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend development servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


Base.metadata.create_all(bind=engine)

@app.get("/")
async def read_root():
    return {"Hello": "World"}
    
    


@app.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_log(
    log_data: LogIngestRequest,
    auth_info: dict = Depends(verify_api_key)
):
    """
    Ingest a single log entry

    - **message**: Log message (required)
    - **level**: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - **service**: Service name
    - **timestamp**: ISO 8601 timestamp (optional, defaults to current time)
    - **metadata**: Additional structured data (optional)
    - **project_id**: Project ID (auto-extracted from API key if not provided)
    """
    try:
        # Prepare log data for Kafka
        log_dict = {
            'timestamp': log_data.timestamp or datetime.utcnow().isoformat(),
            'level': log_data.level.upper(),
            'service': log_data.service,
            'message': log_data.message,
            'metadata': log_data.metadata,
            'project_id': auth_info['project_id']
        }

        # Send to Kafka - consumer will handle DB save
        kafka_producer = get_kafka_producer()
        kafka_success = kafka_producer.send_log(log_dict)

        if not kafka_success:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to send log to Kafka"
            )

        return {
            "status": "accepted",
            "message": "Log queued for processing",
            "timestamp": log_dict['timestamp'],
            "project_id": auth_info['project_id']
        }

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to ingest log: {str(e)}")

 

@app.post("/ingest/batch", status_code=status.HTTP_202_ACCEPTED)
async def ingest_logs_batch(
    logs: List[LogIngestRequest],
    auth_info: dict = Depends(verify_api_key)
):
    """
    Ingest multiple logs in a single request.
    Logs will be queued for processing by the Kafka consumer.

    - **project_id**: Will be auto-extracted from API key for all logs if not provided individually
    """
    try:
        kafka_producer = get_kafka_producer()
        success_count = 0

        for log_data in logs:
            # Prepare log data
            log_dict = {
                'timestamp': log_data.timestamp or datetime.utcnow().isoformat(),
                'level': log_data.level.upper(),
                'service': log_data.service,
                'message': log_data.message,
                'metadata': log_data.metadata,
                'project_id': auth_info['project_id']
            }

            # Send to Kafka - consumer will handle DB save
            if kafka_producer.send_log(log_dict):
                success_count += 1

        if success_count == 0:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to send any logs to Kafka"
            )

        return {
            "status": "accepted",
            "message": f"Batch of {success_count}/{len(logs)} logs queued for processing",
            "queued": success_count,
            "failed": len(logs) - success_count,
            "project_id": auth_info['project_id']
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to ingest batch: {str(e)}"
        )


# storage =None
@app.get("/logs")
async def get_logs(
    # Query parameters
    search: Optional[str] = Query(None, description="Text search query (searches across message, service,metadata)"),
    level: Optional[str] = Query(None, regex="^(DEBUG|INFO|WARNING|ERROR|CRITICAL|ALL)$", description="Filter bylog level"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    backend: Optional[str] = Query(None, regex="^(sqlite|elasticsearch|s3)$", description="Storage backend to use (sqlite, elasticsearch, or s3)"),
    from_ts: Optional[str] = Query(None, description="Start timestamp in ISO 8601 format (e.g.,2024-01-01T00:00:00Z)"),
    to_ts: Optional[str] = Query(None, description="End timestamp in ISO 8601 format (e.g.,2024-12-31T23:59:59Z)"),
    # Pagination
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    size: int = Query(50, ge=1, le=1000, description="Number of items per page"),
):
      try:
          # Get storage backend (with optional backend parameter)
          from storage_factory import get_storage_backend
          # global storage
          # if storage is None:
          storage = get_storage_backend(backend_name=backend)

          # Query logs using storage backend
          result = storage.query_logs(
              search=search,
              level=level,
              service=service,
              from_ts=from_ts,
              to_ts=to_ts,
              page=page,
              size=size,
              project_id=project_id
          )

          return {
              "logs": result.get("logs", []),
              "total": result.get("total", 0),
              "page": result.get("page", page),
              "size": result.get("size", size),
              "total_pages": result.get("total_pages", 0)
          }

      except Exception as e:
          raise HTTPException(
              status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
              detail=f"Failed to query logs: {str(e)}"
          )

@app.get("/logs/services")
def get_services(backend: Optional[str] = Query(None, regex="^(sqlite|elasticsearch)$", description="Storage backend to use (sqlite or elasticsearch)")):
    """
    Get available service names from logs

    - **backend**: Storage backend to use (sqlite or elasticsearch). If not provided, uses default from config
    """
    try:
        # Get storage backend (with optional backend parameter)
        from storage_factory import get_storage_backend
        storage = get_storage_backend(backend_name=backend)

        # Get unique services using storage backend
        result = storage.get_unique_services()

        return {
            "services": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get services: {str(e)}"
        )
    
 
@app.post("/join", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_user(db: Session = Depends(get_db)):
    try:                                                                                                                                   
        username = generate_philosopher_username()                                                                                         
                                                                                                                                                  
        # Generate API key                                                                                                                 
        api_key = generate_api_key()                                                                                                       
                                                                                                                                                  
        # Create new user                                                                                                                  
        new_user = User(                                                                                                                   
            username=username,                                                                                                             
            oauth_token=api_key                                                               
        )                                                                                                                                  
                                                                                                                                            
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
            detail=f"Failed to create user: {str(e)}"                                                                                      
        ) 
        
     
@app.post("/projects", response_model=ProjectCreateResponse, status_code=status.HTTP_201_CREATED)                                          
async def create_project(                                                                                                                  
    project_data: ProjectCreateRequest,                                                                                                    
    db: Session = Depends(get_db)                                                                                                          
):                                                                                                                                         
    """                                                                                                                                    
    Create a new project for a user                                                                                                        
                                                                                                                                            
    - **name**: Project name (required, 1-100 characters)                                                                                  
    - **description**: Project description (optional, max 500 characters)                                                                  
    - **oauth_token**: User's OAuth token for authentication (required)                                                                    
                                                                                                                                            
    Returns:                                                                                                                               
    - **id**: Project ID                                                                                                                   
    - **name**: Project name                                                                                                               
    - **description**: Project description                                                                                                 
    - **api_key**: API key for this project (format: api_key:project_id)                                                                   
    - **owner_id**: User ID who owns this project                                                                                          
    - **created_at**: Creation timestamp                                                                                                   
    - **message**: Success message with API key format                                                                                     
    """                                                                                                                                    
    try:                                                                                                                                   
        # Verify user exists by oauth_token                                                                                                
        user = db.query(User).filter(                                                                                                      
            User.oauth_token == project_data.oauth_token                                                                                   
        ).first()                                                                                                                          
                                                                                                                                            
        if not user:                                                                                                                       
            raise HTTPException(                                                                                                           
                status_code=status.HTTP_404_NOT_FOUND,                                                                                     
                detail="Invalid OAuth token. User not found."                                                                              
            )                                                                                                                              
                                                                                                                                            
        # Generate project-specific API key                                                                                                
        # Format: raw_api_key:project_id (for later extraction)                                                                            
        raw_api_key = generate_api_key()                                                                                                   
        api_key_hash = sha256(raw_api_key.encode()).hexdigest()                                                                            
                                                                                                                                            
        # Create new project                                                                                                               
        new_project = Project(                                                                                                             
            name=project_data.name,                                                                                                        
            description=project_data.description,                                                                                          
            api_key_hash=api_key_hash,                                                                                                     
            owner_id=str(user.id),                                                                                                         
        )                                                                                                                                  
                                                                                                                                            
        db.add(new_project)                                                                                                                
        db.commit()                                                                                                                        
        db.refresh(new_project)                                                                                                            
                                                                                                                                            
        # Format API key as "raw_key:project_id" for client                                                                                
        formatted_api_key = f"{raw_api_key}:{str(new_project.id)}"                                                                         
                                                                                                                                            
        return ProjectCreateResponse(                                                                                                      
            id=str(new_project.id),                                                                                                        
            name=new_project.name,                                                                                                         
            description=new_project.description,                                                                                           
            api_key=formatted_api_key,                                                                                                     
            owner_id=str(new_project.owner_id),                                                                                            
            created_at=new_project.created_at,                                                                                             
        )                                                                                                                                  
                                                                                                                                            
    except HTTPException:                                                                                                                  
        raise                                                                                                                              
    except Exception as e:                                                                                                                 
        db.rollback()                                                                                                                      
        raise HTTPException(                                                                                                               
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,                                                                             
            detail=f"Failed to create project: {str(e)}"                                                                                   
        )                                                                                                                                  
                                                                                                                                            
                                                                                                                                            
@app.get("/projects", status_code=status.HTTP_200_OK)                                                                                      
async def get_user_projects(                                                                                                               
    oauth_token: str = Query(..., description="User's OAuth token"),                                                                       
    db: Session = Depends(get_db)                                                                                                          
):                                                                                                                                         
    """                                                                                                                                    
    Get all projects for a user                                                                                                            
                                                                                                                                            
    - **oauth_token**: User's OAuth token for authentication                                                                               
                                                                                                                                            
    Returns list of projects belonging to the user                                                                                         
    """                                                                                                                                    
    try:                                                                                                                                   
        # Verify user exists                                                                                                               
        user = db.query(User).filter(                                                                                                      
            User.oauth_token == oauth_token                                                                                                
        ).first()                                                                                                                          
                                                                                                                                            
        if not user:                                                                                                                       
            raise HTTPException(                                                                                                           
                status_code=status.HTTP_404_NOT_FOUND,                                                                                     
                detail="Invalid OAuth token. User not found."                                                                              
            )                                                                                                                              
                                                                                                                                            
        # Get all projects for the user                                                                                                    
        projects = db.query(Project).filter(                                                                                               
            Project.owner_id == str(user.id)                                                                                               
        ).all()                                                                                                                            
                                                                                                                                            
        return {                                                                                                                           
            "projects": [                                                                                                                  
                {                                                                                                                          
                    "id": str(project.id),                                                                                                 
                    "name": project.name,                                                                                                  
                    "description": project.description,                                                                                    
                    "created_at": project.created_at.isoformat()                                                                           
                }                                                                                                                          
                for project in projects                                                                                                    
            ],                                                                                                                             
            "total": len(projects)                                                                                                         
        }                                                                                                                                  
                                                                                                                                            
    except HTTPException:                                                                                                                  
        raise                                                                                                                              
    except Exception as e:                                                                                                                 
        raise HTTPException(                                                                                                               
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,                                                                             
            detail=f"Failed to get projects: {str(e)}"                                                                                     
        )    
        



@app.get("/projects/{project_id}/api-key", status_code=status.HTTP_200_OK)                                                                 
async def get_project_api_key(                                                                                                             
    project_id: str,                                                                                                                       
    oauth_token: str = Query(..., description="User's OAuth token"),                                                                       
    db: Session = Depends(get_db)                                                                                                          
):                                                                                                                                         
    """                                                                                                                                    
    Get the API key for a specific project (generates a new key each time)                                                                 
                                                                                                                                            
    - **project_id**: Project ID                                                                                                           
    - **oauth_token**: User's OAuth token for authentication                                                                               
                                                                                                                                            
    Returns the formatted API key (raw_api_key:project_id)                                                                                 
    """                                                                                                                                    
    try:                                                                                                                                   
        # Verify user exists                                                                                                               
        user = db.query(User).filter(                                                                                                      
            User.oauth_token == oauth_token                                                                                                
        ).first()                                                                                                                          
                                                                                                                                            
        if not user:                                                                                                                       
            raise HTTPException(                                                                                                           
                status_code=status.HTTP_404_NOT_FOUND,                                                                                     
                detail="Invalid OAuth token. User not found."                                                                              
            )                                                                                                                              
                                                                                                                                            
        # Get the project                                                                                                                  
        project = db.query(Project).filter(                                                                                                
            Project.id == project_id,                                                                                                      
            Project.owner_id == str(user.id)                                                                                               
        ).first()                                                                                                                          
                                                                                                                                            
        if not project:                                                                                                                    
            raise HTTPException(                                                                                                           
                status_code=status.HTTP_404_NOT_FOUND,                                                                                     
                detail="Project not found."                                                                                                
            )                                                                                                                              
                                                                                                                                            
        # Generate new API key (for security, we generate a new one each time)                                                             
        raw_api_key = generate_api_key()                                                                                                   
        api_key_hash = sha256(raw_api_key.encode()).hexdigest()                                                                            
                                                                                                                                            
        # Update project with new API key hash                                                                                             
        project.api_key_hash = api_key_hash                                                                                                
        db.commit()                                                                                                                        
                                                                                                                                            
        # Format API key as "raw_key:project_id"                                                                                           
        formatted_api_key = f"{raw_api_key}:{str(project.id)}"                                                                             
                                                                                                                                            
        return {                                                                                                                           
            "project_id": str(project.id),                                                                                                 
            "api_key": formatted_api_key,                                                                                                  
            "message": "New API key generated. Previous key has been invalidated."                                                         
        }                                                                                                                                  
                                                                                                                                            
    except HTTPException:                                                                                                                  
        raise                                                                                                                              
    except Exception as e:                                                                                                                 
        db.rollback()                                                                                                                      
        raise HTTPException(                                                                                                               
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,                                                                             
            detail=f"Failed to generate API key: {str(e)}"                                                                                 
        )

    
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)