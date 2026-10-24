import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from typing import Optional
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

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/jfif", "image/jpg",
    "image/pjpeg", "image/gif", "application/octet-stream"
}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".jfif", ".pjpeg", ".gif"}


# Endpoint to upload a roster screenshot and extract/upsert shifts with AI
@router.post("/upload")
async def upload_roster(
    file: UploadFile = File(...),
    employee_name: Optional[str] = Form(default=None),
    session: Session = Depends(get_session)
):
    # Validate that the uploaded file is an image by MIME type or extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    is_valid_type = (
        (file.content_type and (file.content_type.startswith("image/") or file.content_type in ALLOWED_TYPES))
        or ext in IMAGE_EXTENSIONS
    )
    if not is_valid_type:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Please upload a screenshot or image (PNG, JPEG, WebP, etc.)."
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
        extraction = extract_shifts_from_image(file_path, mime_type=file.content_type, employee_name=employee_name)
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


from pydantic import BaseModel
from datetime import date as DateType, time as TimeType

class ShiftSaveRequest(BaseModel):
    shift_date: DateType
    start_time: Optional[TimeType] = None
    end_time: Optional[TimeType] = None
    is_day_off: bool = False
    raw_text: Optional[str] = None
    label: Optional[str] = None
    notes: Optional[str] = None
    event_type: Optional[str] = "work"
    is_not_work: bool = False
    icon: Optional[str] = None


class BatchDeleteRequest(BaseModel):
    dates: list[str]


# Save or update an individual date entry (work shift, day off, or personal activity)
@router.post("/save", response_model=Shift)
def save_shift(req: ShiftSaveRequest, session: Session = Depends(get_session)):
    existing = session.exec(
        select(Shift).where(Shift.shift_date == req.shift_date)
    ).first()

    if existing:
        existing.start_time = req.start_time
        existing.end_time = req.end_time
        existing.is_day_off = req.is_day_off
        existing.raw_text = req.raw_text
        existing.label = req.label
        existing.notes = req.notes
        existing.event_type = req.event_type
        existing.is_not_work = req.is_not_work
        existing.icon = req.icon
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    else:
        new_shift = Shift(
            shift_date=req.shift_date,
            start_time=req.start_time,
            end_time=req.end_time,
            is_day_off=req.is_day_off,
            raw_text=req.raw_text,
            label=req.label,
            notes=req.notes,
            event_type=req.event_type,
            is_not_work=req.is_not_work,
            icon=req.icon,
        )
        session.add(new_shift)
        session.commit()
        session.refresh(new_shift)
        return new_shift


# Delete an individual date entry by date string (YYYY-MM-DD)
@router.delete("/date/{date_str}")
def delete_shift_by_date(date_str: str, session: Session = Depends(get_session)):
    try:
        parsed_date = DateType.fromisoformat(date_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    shift = session.exec(select(Shift).where(Shift.shift_date == parsed_date)).first()
    if not shift:
        return {"success": True, "message": "Date was not found or already deleted", "deleted_date": date_str}

    session.delete(shift)
    session.commit()
    return {"success": True, "message": f"Successfully deleted entry for {date_str}", "deleted_date": date_str}


# Reset / completely delete an individual week or batch of dates
@router.post("/delete-batch")
def delete_shifts_batch(req: BatchDeleteRequest, session: Session = Depends(get_session)):
    if not req.dates:
        return {"success": True, "deleted_count": 0}

    parsed_dates = []
    for d in req.dates:
        try:
            parsed_dates.append(DateType.fromisoformat(d))
        except Exception:
            continue

    if not parsed_dates:
        return {"success": True, "deleted_count": 0}

    shifts_to_delete = session.exec(
        select(Shift).where(Shift.shift_date.in_(parsed_dates))
    ).all()

    count = len(shifts_to_delete)
    for s in shifts_to_delete:
        session.delete(s)
    session.commit()

    return {"success": True, "deleted_count": count, "dates": req.dates}


# Clear all shifts
@router.delete("/all")
def clear_all_shifts(session: Session = Depends(get_session)):
    all_shifts = session.exec(select(Shift)).all()
    count = len(all_shifts)
    for s in all_shifts:
        session.delete(s)
    session.commit()
    return {"success": True, "deleted_count": count, "message": "All shifts cleared"}

