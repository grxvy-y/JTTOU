import os
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

# Load environmental variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine to talk to PostgreSQL
# echo=True prints all SQL queries to the terminal (great for learning/debugging!)
engine = create_engine(DATABASE_URL, echo=True)

# Automatically create tables in Postgres
def init_db():
    SQLModel.metadata.create_all(engine)

# Function to safely borrow a database connection for requests
def get_session():
    with Session(engine) as session:
        yield session
