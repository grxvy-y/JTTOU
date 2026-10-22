import os
import json
import re
import time
import base64
from datetime import date as DateType, time as TimeType, datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()


class ShiftExtractionItem(BaseModel):
    """Represents a single shift or day off extracted from a roster image."""
    shift_date: DateType = Field(description="Date of the shift in YYYY-MM-DD format")
    start_time: Optional[TimeType] = Field(
        default=None,
        description="Shift start time in HH:MM:SS (24-hr format). None if day off."
    )
    end_time: Optional[TimeType] = Field(
        default=None,
        description="Shift end time in HH:MM:SS (24-hr format). None if day off."
    )
    is_day_off: bool = Field(
        default=False,
        description="True if the person has a day off, RDO, leave, or is not scheduled."
    )
    raw_text: Optional[str] = Field(
        default=None,
        description="The exact raw text read for this day from the roster (e.g. '09:00 - 17:00 Floor' or 'OFF')."
    )


class RosterExtractionResult(BaseModel):
    """The structured result containing all extracted shifts and metadata."""
    provider_used: str = Field(description="The AI provider used: gemini or openai")
    model_used: str = Field(description="The specific AI model version used")
    shifts: list[ShiftExtractionItem] = Field(default_factory=list)
    notes: Optional[str] = Field(default=None, description="Any observations or warnings from the AI")


def _build_roster_prompt(employee_name: str | None = None) -> str:
    """Build a format-aware roster extraction prompt, optionally targeting a specific employee name."""

    name_hint = ""
    if employee_name and employee_name.strip():
        name_hint = f"""
IMPORTANT — EMPLOYEE NAME TO SEARCH FOR: "{employee_name.strip()}"
You MUST find this exact person (or the closest name match) in the schedule and ONLY extract their shifts.
Do NOT extract shifts for any other employee. If you cannot find this name, return an empty shifts array and note the issue.
"""

    return f"""You are a highly accurate AI vision assistant that reads employee work schedules and extracts shift data.
{name_hint}
You will encounter one of TWO schedule formats. Identify which format is present first, then extract accordingly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT A — CALENDAR VIEW (month/week calendar grid)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This format shows a standard calendar grid (days of week across the top, dates in cells).
Working days are indicated by a black underline, bold marker, dot, highlight, or any visible mark UNDER or ON the date number.
Days without any mark are DAYS OFF.

RULES for Format A:
1. Scan every date cell in the calendar.
2. If a date cell has a visible mark (underline, bar, dot, highlight, tick, or any indicator below/on the number) → it is a WORKING day. Set is_day_off=false. If no shift times are visible, set start_time and end_time to null.
3. If a date cell is completely plain/empty with NO mark → it is a DAY OFF. Set is_day_off=true.
4. DO NOT assume random days are working days. Only mark a day as a shift if there is a clear visible indicator on that specific date.
5. If shift times (e.g. "9:00-17:00") are written inside or near the date cell, extract them. Otherwise leave start_time and end_time null.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT B — EXCEL/SPREADSHEET VIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This format is a table/grid where:
- Row 1 (top row): dates (e.g. "Oct 21", "Oct 22", etc.) span across columns
- Row 2: day of week abbreviations (Mon, Tue, Wed...)
- Row 3+: "AM" and "PM" sub-columns for each date
- Left-most column: employee names listed vertically (one employee per row or every 2 rows for AM/PM)

RULES for Format B:
1. First, locate the employee named "{employee_name or '[THE TARGET EMPLOYEE]'}" in the leftmost column. This may be a partial match (e.g. first name only).
2. Read ACROSS that employee's row(s) for each date column.
3. For each date:
   - If the AM cell shows a time (e.g. "8:00", "8AM") and is NOT "OFF" or blank → working AM shift
   - If the PM cell shows a time (e.g. "16:00", "4PM") and is NOT "OFF" or blank → working PM shift
   - If BOTH AM and PM show times → the person works both; use AM start and PM end as the shift range
   - If a cell shows "OFF", is blank, or has an X → day off for that shift portion
   - If BOTH AM and PM are OFF/blank → is_day_off=true for that date
4. Since spreadsheets may be wide and screenshots may be partial, extract ALL visible dates.
5. Be careful: each row belongs to ONE specific employee. Do not mix up rows.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERAL RULES (apply to both formats)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Always format shift_date as YYYY-MM-DD. Infer year from context or use 2026.
- Convert all times to 24-hour HH:MM:SS format.
- For "OFF", "RDO", "X", blank, "Leave", "Sick": set is_day_off=true, start_time=null, end_time=null.
- raw_text should capture exactly what is written in the cell for that date.
- In your "notes" field, state which format (A or B) you detected.

Return ONLY a valid JSON object with this schema — no extra text:
{{
  "shifts": [
    {{
      "shift_date": "YYYY-MM-DD",
      "start_time": "HH:MM:SS" or null,
      "end_time": "HH:MM:SS" or null,
      "is_day_off": true or false,
      "raw_text": "exact text seen for this date"
    }}
  ],
  "notes": "Format detected (A or B), employee found or not found, any ambiguity"
}}"""



def _clean_json_string(text: str) -> str:
    """Extract raw JSON content if the model wraps it in markdown code fences."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def _extract_with_gemini(image_bytes: bytes, mime_type: str, api_key: str, model_name: str = "gemini-3.6-flash", employee_name: str | None = None) -> RosterExtractionResult:
    """Extract roster shifts using Google Gemini Vision API."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    # Use specified model, deduplicating candidate flash fallbacks
    candidates = [model_name]
    for m in ["gemini-flash-latest", "gemini-3.6-flash"]:
        if m not in candidates:
            candidates.append(m)

    last_err = None

    for model in candidates:
        # Retry up to 3 times per model in case of temporary 503 spikes
        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[image_part, _build_roster_prompt(employee_name)],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )
                raw_json = _clean_json_string(response.text)
                parsed_data = json.loads(raw_json)

                if isinstance(parsed_data, list):
                    raw_shifts = parsed_data
                    notes = None
                elif isinstance(parsed_data, dict):
                    raw_shifts = parsed_data.get("shifts", [])
                    notes = parsed_data.get("notes")
                else:
                    raw_shifts = []
                    notes = None

                shifts = [ShiftExtractionItem(**item) for item in raw_shifts]
                return RosterExtractionResult(
                    provider_used="gemini",
                    model_used=model,
                    shifts=shifts,
                    notes=notes,
                )
            except Exception as e:
                last_err = e
                # Check for temporary 503 UNAVAILABLE spike
                err_str = str(e)
                if "503" in err_str or "UNAVAILABLE" in err_str:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                # For non-503 errors (like 404), move to next candidate model immediately
                break

    raise RuntimeError(f"Gemini vision extraction failed with candidate models {candidates}: {last_err}")


def _extract_with_openai(image_bytes: bytes, mime_type: str, api_key: str, model_name: str = "gpt-4o", employee_name: str | None = None) -> RosterExtractionResult:
    """Extract roster shifts using OpenAI GPT-4o Vision API."""
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{base64_image}"

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _build_roster_prompt(employee_name)},
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                ],
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )

    content = response.choices[0].message.content
    raw_json = _clean_json_string(content)
    parsed_data = json.loads(raw_json)

    if isinstance(parsed_data, list):
        raw_shifts = parsed_data
        notes = None
    elif isinstance(parsed_data, dict):
        raw_shifts = parsed_data.get("shifts", [])
        notes = parsed_data.get("notes")
    else:
        raw_shifts = []
        notes = None

    shifts = [ShiftExtractionItem(**item) for item in raw_shifts]
    return RosterExtractionResult(
        provider_used="openai",
        model_used=model_name,
        shifts=shifts,
        notes=notes,
    )


def _generate_mock_shifts(notes: str = "Demo mode — Add GEMINI_API_KEY in backend/.env for live AI extraction") -> RosterExtractionResult:
    """Generate realistic shifts for the current week for preview/demo when AI keys are not configured."""
    from datetime import date, timedelta, time as TimeType
    today = date.today()
    start = today - timedelta(days=today.weekday())
    mock_items = [
        ShiftExtractionItem(
            shift_date=start + timedelta(days=0),
            start_time=TimeType(9, 0, 0),
            end_time=TimeType(17, 0, 0),
            is_day_off=False,
            raw_text="09:00 - 17:00 Day Shift"
        ),
        ShiftExtractionItem(
            shift_date=start + timedelta(days=1),
            start_time=TimeType(10, 0, 0),
            end_time=TimeType(18, 0, 0),
            is_day_off=False,
            raw_text="10:00 - 18:00 Mid Shift"
        ),
        ShiftExtractionItem(
            shift_date=start + timedelta(days=2),
            start_time=None,
            end_time=None,
            is_day_off=True,
            raw_text="OFF / RDO"
        ),
        ShiftExtractionItem(
            shift_date=start + timedelta(days=3),
            start_time=TimeType(9, 30, 0),
            end_time=TimeType(17, 30, 0),
            is_day_off=False,
            raw_text="09:30 - 17:30 Day Shift"
        ),
        ShiftExtractionItem(
            shift_date=start + timedelta(days=4),
            start_time=TimeType(11, 0, 0),
            end_time=TimeType(19, 0, 0),
            is_day_off=False,
            raw_text="11:00 - 19:00 Closing"
        ),
        ShiftExtractionItem(
            shift_date=start + timedelta(days=5),
            start_time=None,
            end_time=None,
            is_day_off=True,
            raw_text="OFF / RDO"
        ),
        ShiftExtractionItem(
            shift_date=start + timedelta(days=6),
            start_time=None,
            end_time=None,
            is_day_off=True,
            raw_text="OFF / RDO"
        ),
    ]
    return RosterExtractionResult(
        provider_used="demo-fallback",
        model_used="demo-schedule",
        shifts=mock_items,
        notes=notes,
    )


def extract_shifts_from_image(
    image_path: str,
    mime_type: Optional[str] = None,
    provider: Optional[Literal["gemini", "openai"]] = None,
    employee_name: Optional[str] = None,
) -> RosterExtractionResult:
    """
    Main entry point for extracting shift data from a roster image.
    Automatically detects AI provider from environment variables if not specified.
    Falls back to realistic demo shifts if keys are not set or if extraction fails.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Roster image not found at: {image_path}")

    # Detect mime type if not provided
    if not mime_type or mime_type == "application/octet-stream":
        lower_path = image_path.lower()
        if lower_path.endswith(".png"):
            mime_type = "image/png"
        elif lower_path.endswith(".webp"):
            mime_type = "image/webp"
        else:
            mime_type = "image/jpeg"

    # Normalize jfif to jpeg for APIs
    if mime_type in ("image/jfif", "image/pjpeg"):
        mime_type = "image/jpeg"

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # Determine provider and keys
    selected_provider = provider or os.getenv("AI_PROVIDER")
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if not gemini_key and not openai_key:
        print("[INFO] No AI provider keys set in backend/.env — using demo schedule extraction.")
        return _generate_mock_shifts("Demo mode — Add GEMINI_API_KEY in backend/.env for live AI extraction")

    try:
        if (selected_provider == "gemini" and gemini_key) or gemini_key:
            gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
            return _extract_with_gemini(image_bytes, mime_type, gemini_key, gemini_model, employee_name=employee_name)
        elif openai_key:
            openai_model = os.getenv("OPENAI_MODEL", "gpt-4o")
            return _extract_with_openai(image_bytes, mime_type, openai_key, openai_model, employee_name=employee_name)
        else:
            return _generate_mock_shifts()
    except Exception as e:
        print(f"[WARN] AI vision extraction error: {e}. Falling back to demo schedule.")
        return _generate_mock_shifts(f"AI extraction error ({e}) — demo schedule used")
