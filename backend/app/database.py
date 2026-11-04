import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("opspilot.database")

def get_engine():
    db_url = settings.DATABASE_URL
    
    # Normalize legacy postgres:// to postgresql://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    # If postgresql:// is provided without explicit driver, use psycopg (psycopg3)
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        
    if db_url.startswith("sqlite"):
        logger.info("Configuring SQLite database engine.")
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True
        )
    else:
        logger.info("Configuring PostgreSQL database engine.")
        return create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            pool_recycle=300
        )

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI dependency for yielding database session with automatic cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
