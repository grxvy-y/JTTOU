from datetime import date, time, datetime
from sqlmodel import SQLModel, Field

# Represents one day on the work roster — either a shift or a day off
class Shift(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    date: date = Field(index=True)             # The calendar date (e.g. 2026-08-20)
    start_time: time | None = Field(default=None)  # Work start time (None if day off)
    end_time: time | None = Field(default=None)    # Work end time (None if day off)
    is_day_off: bool = Field(default=False)    # True = free day, triggers weather + Telegram alert
    raw_text: str | None = Field(default=None) # Original text the AI extracted from the image
    created_at: datetime = Field(default_factory=datetime.utcnow)  # When this was saved
