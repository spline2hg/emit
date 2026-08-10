import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from db import engine
from models import Base
from routers import chat, ingest, logs, users, workspaces

Base.metadata.create_all(bind=engine)

# Keep the local SQLite schema compatible with chat sessions created before
# tool traces and turn grouping were added.
if engine.dialect.name == "sqlite":
    columns = {column["name"] for column in inspect(engine).get_columns("chat_messages")}
    if "turn_id" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE chat_messages ADD COLUMN turn_id VARCHAR"))

app = FastAPI(title="Mini Log Pipeline")

cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(logs.router)
app.include_router(users.router)
app.include_router(workspaces.router)
app.include_router(chat.router)


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
