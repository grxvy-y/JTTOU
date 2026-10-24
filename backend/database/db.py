import os
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text
from dotenv import load_dotenv

# Load environmental variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Try to connect to configured DATABASE_URL, or fall back to SQLite
def create_robust_engine():
    if DATABASE_URL:
        try:
            # Short connect timeout so we don't hang if Supabase is offline
            eng = create_engine(
                DATABASE_URL,
                echo=False,
                connect_args={"connect_timeout": 3} if "postgresql" in DATABASE_URL else {}
            )
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            return eng
        except Exception as e:
            print(f"[WARN] PostgreSQL connection failed ({e}). Falling back to local SQLite database.")
    
    # Fallback SQLite engine
    sqlite_url = "sqlite:///./shifts.db"
    return create_engine(sqlite_url, echo=False, connect_args={"check_same_thread": False})

engine = create_robust_engine()

# Automatically create tables and ensure new columns exist
def init_db():
    global engine
    from database import models
    try:
        SQLModel.metadata.create_all(engine)
    except Exception as e:
        print(f"[WARN] Failed to create tables on primary engine ({e}). Re-initializing on SQLite...")
        engine = create_engine("sqlite:///./shifts.db", echo=False, connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(engine)

    # Ensure optional columns exist in case table was created with earlier schema
    new_cols = [
        ("label", "TEXT"),
        ("notes", "TEXT"),
        ("event_type", "TEXT"),
        ("is_not_work", "BOOLEAN DEFAULT 0"),
        ("icon", "TEXT"),
    ]
    with engine.connect() as conn:
        for col, typ in new_cols:
            try:
                conn.execute(text(f"ALTER TABLE shift ADD COLUMN {col} {typ}"))
                conn.commit()
            except Exception:
                # Column already exists or table not ready
                pass


# Function to safely borrow a database connection for requests
def get_session():
    with Session(engine) as session:
        yield session
