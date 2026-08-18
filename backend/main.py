from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import init_db
from routers.shifts import router as shifts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Server Startup ---
    try:
        init_db()
        print("[SUCCESS] Database connection successful and tables initialized!")
    except Exception as e:
        print("[ERROR] Database connection failed!")
        print(e)

    yield  # The server runs here...

    # --- Server Shutdown ---
    print("[SHUTDOWN] Server shutting down...")


# FastAPI app instance
app = FastAPI(title="Pookie Calendar API", lifespan=lifespan)

# Include API routers
app.include_router(shifts_router)

# CORS — allows the React frontend (port 5173) to talk to this backend (port 8000)
origins = [
    "http://localhost:5173",
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
    return {"message": "Welcome to the Pookie Calendar API!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
