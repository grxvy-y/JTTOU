from datetime import date as DateType, time as TimeType, datetime
from sqlmodel import SQLModel, Field
from typing import Optional


# Represents one day on the schedule — either a work shift, day off, or personal / outside of work activity
class Shift(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    shift_date: DateType = Field(index=True)             # The calendar date (e.g. 2026-08-20)
    start_time: Optional[TimeType] = Field(default=None) # Work start time (None if day off / personal)
    end_time: Optional[TimeType] = Field(default=None)   # Work end time (None if day off / personal)
    is_day_off: bool = Field(default=False)              # True = free day, triggers weather + Telegram alert
    raw_text: Optional[str] = Field(default=None)        # Original text the AI extracted from the image
    label: Optional[str] = Field(default=None)           # Custom name/title of the date
    notes: Optional[str] = Field(default=None)           # Details added by the user
    event_type: Optional[str] = Field(default="work")    # "work" | "day_off" | "personal"
    is_not_work: bool = Field(default=False)             # True if day is not job related (outside of work)
    icon: Optional[str] = Field(default=None)            # Icon indicator (e.g. 🌟, 🎉, 🏃, 💼, 💕)
    created_at: datetime = Field(default_factory=datetime.utcnow)  # When this was saved

