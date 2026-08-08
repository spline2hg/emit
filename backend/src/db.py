from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Config

SQLALCHEMY_DATABASE_URL = Config.SQLITE_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()