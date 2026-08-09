from fastapi import Header, HTTPException
from sqlalchemy.orm import Session
from db import SessionLocal
from models import Workspace
from hashlib import sha256
import random
import secrets

def verify_api_key(
    api_key: str = Header(None, alias="X-API-Key"),
):
    """Authenticate a request with an opaque workspace API key."""
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")

    db: Session = SessionLocal()
    try:
        api_key_hash = sha256(api_key.encode()).hexdigest()
        workspace = db.query(Workspace).filter(
            Workspace.api_key_hash == api_key_hash
        ).first()

        if not workspace:
            raise HTTPException(status_code=401, detail="Invalid API key")

        # The key resolves to the workspace and, through it, its owner.
        return {
            "workspace_id": str(workspace.id),
            "owner_id": str(workspace.owner_id),
            "api_key": api_key,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying API key: {str(e)}")
    finally:
        db.close()


# List of famous philosophers for username generation
PHILOSOPHERS = [
    "socrates", "plato", "aristotle", "kant", "nietzsche", "confucius",
    "descartes", "locke", "hume", "hegel", "marx", "freud", "wittgenstein",
    "sartre", "camus", "kierkegaard", "spinoza", "leibniz", "schopenhauer",
    "rousseau", "bentham", "mill", "rawls", "arendt", "butler", "foucault",
    "derrida", "debord", "baudrillard", "zorba", "epictetus", "seneca",
    "marcus_aurelius", "plotinus", "avverroes", "averroes", "maimonides",
    "aquinas", "ockham", "hobbes", "berkeley", "kierkegaard", "heidegger"
]


def generate_philosopher_username():
    """Generate a random philosopher username with a 4-digit number"""
    philosopher = random.choice(PHILOSOPHERS)
    number = random.randint(1000, 9999)
    return f"{philosopher}_{number}"


def generate_api_key():
    """Generate a secure random API key"""
    return secrets.token_urlsafe(32)