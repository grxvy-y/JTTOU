from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Pooks API", version="1.0.0")

# Set up CORS middleware to allow communication from the React frontend
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
