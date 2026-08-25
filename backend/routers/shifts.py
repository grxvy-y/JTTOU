import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlmodel import Session, select
from database.db import get_session
from database.models import Shift

# All shift-related endpoints grouped under /shifts
router = APIRouter(prefix="/shifts", tags=["shifts"])

# Folder where uploaded roster screenshots will be saved temporarily
# /tmp is the only writable directory on Vercel serverless — "uploads/" would crash with EROFS
UPLOAD_DIR = "/tmp/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


# Endpoint to upload a roster screenshot
@router.post("/upload")
async def upload_roster(file: UploadFile = File(...)):
    # Validate that the uploaded file is an image
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Please upload a JPEG, PNG, or WebP image."
        )

    # Save the file to the uploads folder
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # AI parsing will be added in the next step
    return {
        "message": "Roster image uploaded successfully!",
        "filename": file.filename,
        "status": "pending_ai_parse"
    }


# Endpoint to get all saved shifts
@router.get("/", response_model=list[Shift])
def get_shifts(session: Session = Depends(get_session)):
    shifts = session.exec(select(Shift)).all()
    return shifts


# Endpoint to get only days off
@router.get("/days-off", response_model=list[Shift])
def get_days_off(session: Session = Depends(get_session)):
    days_off = session.exec(select(Shift).where(Shift.is_day_off == True)).all()
    return days_off
