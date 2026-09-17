import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlmodel import Session, select
from database.db import get_session
from database.models import Shift
from services.vision import extract_shifts_from_image

# All shift-related endpoints grouped under /shifts
router = APIRouter(prefix="/shifts", tags=["shifts"])

# Folder where uploaded roster screenshots will be saved temporarily
# Use /tmp on Linux/Vercel serverless, or local uploads/ on Windows/development
if os.name == "nt":
    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
else:
    UPLOAD_DIR = "/tmp/uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


# Endpoint to upload a roster screenshot and extract/upsert shifts with AI
@router.post("/upload")
async def upload_roster(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    # Validate that the uploaded file is an image
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Please upload a JPEG, PNG, or WebP image."
        )

    # Save the file with a unique filename
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save uploaded file: {str(e)}"
        )

    # Run AI Vision extraction
    try:
        extraction = extract_shifts_from_image(file_path, mime_type=file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI vision roster parsing failed: {str(e)}"
        )
    finally:
        # Clean up temporary uploaded file after extraction
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

    if not extraction.shifts:
        return {
            "message": "AI processed the image, but no shift dates were detected.",
            "provider_used": extraction.provider_used,
            "model_used": extraction.model_used,
            "notes": extraction.notes,
            "saved_count": 0,
            "days_off_count": 0,
            "shifts": []
        }

    # Upsert shifts into Supabase database
    saved_shifts: list[Shift] = []
    try:
        for item in extraction.shifts:
            # Check if shift already exists for this date
            existing_shift = session.exec(
                select(Shift).where(Shift.shift_date == item.shift_date)
            ).first()

            if existing_shift:
                # Update existing record
                existing_shift.start_time = item.start_time
                existing_shift.end_time = item.end_time
                existing_shift.is_day_off = item.is_day_off
                existing_shift.raw_text = item.raw_text
                session.add(existing_shift)
                saved_shifts.append(existing_shift)
            else:
                # Insert new shift record
                new_shift = Shift(
                    shift_date=item.shift_date,
                    start_time=item.start_time,
                    end_time=item.end_time,
                    is_day_off=item.is_day_off,
                    raw_text=item.raw_text,
                )
                session.add(new_shift)
                saved_shifts.append(new_shift)

        session.commit()
        for s in saved_shifts:
            session.refresh(s)
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database error while saving shifts: {str(e)}"
        )

    days_off = sum(1 for s in saved_shifts if s.is_day_off)
    working_shifts = len(saved_shifts) - days_off

    return {
        "message": f"Successfully parsed and saved {len(saved_shifts)} dates ({working_shifts} shifts, {days_off} days off)!",
        "provider_used": extraction.provider_used,
        "model_used": extraction.model_used,
        "notes": extraction.notes,
        "saved_count": len(saved_shifts),
        "working_shifts_count": working_shifts,
        "days_off_count": days_off,
        "shifts": saved_shifts
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
