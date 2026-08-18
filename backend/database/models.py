from datetime import date as DateType, time as TimeType, datetime
from sqlmodel import SQLModel, Field
from typing import Optional


# Represents one day on the work roster — either a shift or a day off
class Shift(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    shift_date: DateType = Field(index=True)             # The calendar date (e.g. 2026-08-20)
    start_time: Optional[TimeType] = Field(default=None) # Work start time (None if day off)
    end_time: Optional[TimeType] = Field(default=None)   # Work end time (None if day off)
    is_day_off: bool = Field(default=False)              # True = free day, triggers weather + Telegram alert
    raw_text: Optional[str] = Field(default=None)        # Original text the AI extracted from the image
    created_at: datetime = Field(default_factory=datetime.utcnow)  # When this was saved
