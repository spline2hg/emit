from fastapi import Header, HTTPException
from sqlalchemy.orm import Session
from db import SessionLocal
from models import Project
from hashlib import sha256
import random
import secrets

def verify_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
        
    api_key, project_id = x_api_key.split(":")
    db: Session = SessionLocal()
    try:
        api_key_hash = sha256(api_key.encode()).hexdigest()
        
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.api_key_hash == api_key_hash
        ).first()

        if not project:
            raise HTTPException(status_code=401, detail="Invalid API key")

        # Return both project_id and the api_key for downstream use
        return {
            "project_id": project_id,
            "api_key": api_key
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