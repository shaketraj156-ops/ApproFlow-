from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings

Base = declarative_base()

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    # SQLAlchemy 2.0 with psycopg
    pass

engine = create_engine(
    db_url,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
