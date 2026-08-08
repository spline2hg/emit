import sys
import os
from pathlib import Path

# Make backend/src importable (mirrors sys.path.insert in main.py)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

# Use a temp sqlite db so tests never touch the real logs.db
os.environ["SQLITE_DATABASE_URL"] = "sqlite:///./test_logs.db"
os.environ["STORAGE_BACKEND"] = "sqlite"

import pytest
from fastapi.testclient import TestClient

from main import app
from db import engine
from models import Base


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


def _make_user_and_workspace(client):
    user = client.post("/users").json()
    oauth_token = user["api_key"]

    ws = client.post(
        "/workspaces",
        json={"name": "test-ws", "description": "d", "oauth_token": oauth_token},
    ).json()
    return oauth_token, ws


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_create_user(client):
    r = client.post("/users")
    assert r.status_code == 201
    data = r.json()
    assert "id" in data
    assert "username" in data
    assert "api_key" in data


def test_users_me(client):
    user = client.post("/users").json()
    r = client.get("/users/me", params={"oauth_token": user["api_key"]})
    assert r.status_code == 200
    assert r.json()["username"] == user["username"]


def test_create_workspace(client):
    oauth_token, ws = _make_user_and_workspace(client)
    assert ws["name"] == "test-ws"
    assert ":" in ws["api_key"]  # format: raw_key:workspace_id


def test_list_workspaces(client):
    oauth_token, ws = _make_user_and_workspace(client)
    r = client.get("/workspaces", params={"oauth_token": oauth_token})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert data["workspaces"][0]["id"] == ws["id"]


def test_verify_api_key_rejects_missing(client):
    r = client.post("/ingest", json={"message": "hi", "level": "INFO", "service": "s"})
    assert r.status_code == 401


def test_verify_api_key_rejects_malformed(client):
    # No colon -> should be 400, not 500
    r = client.post(
        "/ingest",
        json={"message": "hi", "level": "INFO", "service": "s"},
        headers={"X-API-Key": "nocolonhere"},
    )
    assert r.status_code == 400


def test_verify_api_key_rejects_bad_key(client):
    oauth_token, ws = _make_user_and_workspace(client)
    r = client.post(
        "/ingest",
        json={"message": "hi", "level": "INFO", "service": "s"},
        headers={"X-API-Key": f"wrongkey:{ws['id']}"},
    )
    assert r.status_code == 401
