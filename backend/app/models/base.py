from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings

Base = declarative_base()

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        # Anything raised while handling the request must not leave a half-done transaction behind.
        db.rollback()
        raise
    finally:
        db.close()
