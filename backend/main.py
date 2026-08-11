from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import engine 

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Server Startup ---
    try:
        # Attempt to open a quick connection to Postgres
        with engine.connect() as connection:
            print("[SUCCESS] Database connection successful!")
    except Exception as e:
        print("[ERROR] Database connection failed!")
        print(e)
        
    yield  # The server runs here...
    
    # --- Server Shutdown ---
    print("[SHUTDOWN] Server shutting down...")

# Pass the lifespan handler to your FastAPI app
app = FastAPI(title="Pooks API", lifespan=lifespan)

# Restore CORS middleware to allow communication from the React frontend
origins = [
    "http://localhost:5173",  # React Vite local development server
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Pooks API backend!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

