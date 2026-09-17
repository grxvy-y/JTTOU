import os
import json
import re
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


ROSTER_VISION_PROMPT = """You are an expert AI vision assistant specialized in reading employee work schedules and restaurant rosters.
Analyze the provided roster image carefully and extract all scheduled days, shifts, and days off for the relevant person.

Rules:
1. Examine the roster table, grid, or list. Identify each day/date listed (e.g. Monday Aug 24 through Sunday Aug 30).
2. If only month and day or weekday are visible, infer the year from context or assume the current year (2026). Always format `shift_date` as `YYYY-MM-DD`.
3. For each date:
   - If working a shift: extract `start_time` and `end_time` in 24-hour time format (HH:MM:SS). For example: "9:00 AM - 5:30 PM" becomes start "09:00:00", end "17:30:00".
   - If marked as a day off, "OFF", "RDO", "X", blank day off, "Leave", "Sick", or unavailable:
     set `is_day_off` to true, `start_time` to null, and `end_time` to null.
   - Capture the `raw_text` snippet representing what is written in the cell or line for that date.
4. Return ONLY a valid JSON object strictly matching this schema:
{
  "shifts": [
    {
      "shift_date": "YYYY-MM-DD",
      "start_time": "HH:MM:SS" or null,
      "end_time": "HH:MM:SS" or null,
      "is_day_off": true or false,
      "raw_text": "text seen on roster"
    }
  ],
  "notes": "optional notes regarding roster name, week dates, or ambiguity"
}
"""


def _clean_json_string(text: str) -> str:
    """Extract raw JSON content if the model wraps it in markdown code fences."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def _extract_with_gemini(image_bytes: bytes, mime_type: str, api_key: str, model_name: str = "gemini-2.5-flash") -> RosterExtractionResult:
    """Extract roster shifts using Google Gemini Vision API."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    # Attempt primary model, with fallback to gemini-1.5-flash if unavailable
    candidate_models = [model_name, "gemini-2.0-flash", "gemini-1.5-flash"]
    last_err = None

    for model in candidate_models:
        try:
            response = client.models.generate_content(
                model=model,
                contents=[image_part, ROSTER_VISION_PROMPT],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            raw_json = _clean_json_string(response.text)
            parsed_data = json.loads(raw_json)

            shifts = [ShiftExtractionItem(**item) for item in parsed_data.get("shifts", [])]
            return RosterExtractionResult(
                provider_used="gemini",
                model_used=model,
                shifts=shifts,
                notes=parsed_data.get("notes"),
            )
        except Exception as e:
            last_err = e
            # Try next model if it's a 404/not found or specific model availability issue
            continue

    raise RuntimeError(f"Gemini vision extraction failed with all candidate models: {last_err}")


def _extract_with_openai(image_bytes: bytes, mime_type: str, api_key: str, model_name: str = "gpt-4o") -> RosterExtractionResult:
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
                    {"type": "text", "text": ROSTER_VISION_PROMPT},
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

    shifts = [ShiftExtractionItem(**item) for item in parsed_data.get("shifts", [])]
    return RosterExtractionResult(
        provider_used="openai",
        model_used=model_name,
        shifts=shifts,
        notes=parsed_data.get("notes"),
    )


def extract_shifts_from_image(
    image_path: str,
    mime_type: Optional[str] = None,
    provider: Optional[Literal["gemini", "openai"]] = None,
) -> RosterExtractionResult:
    """
    Main entry point for extracting shift data from a roster image.
    Automatically detects AI provider from environment variables if not specified.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Roster image not found at: {image_path}")

    # Detect mime type if not provided
    if not mime_type:
        lower_path = image_path.lower()
        if lower_path.endswith(".png"):
            mime_type = "image/png"
        elif lower_path.endswith(".webp"):
            mime_type = "image/webp"
        else:
            mime_type = "image/jpeg"

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # Determine provider and keys
    selected_provider = provider or os.getenv("AI_PROVIDER")
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if not selected_provider:
        if gemini_key:
            selected_provider = "gemini"
        elif openai_key:
            selected_provider = "openai"
        else:
            raise ValueError(
                "No AI provider API key found. Please set GEMINI_API_KEY or OPENAI_API_KEY in backend/.env."
            )

    if selected_provider == "gemini":
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY is not set in backend/.env")
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        return _extract_with_gemini(image_bytes, mime_type, gemini_key, gemini_model)

    elif selected_provider == "openai":
        if not openai_key:
            raise ValueError("OPENAI_API_KEY is not set in backend/.env")
        openai_model = os.getenv("OPENAI_MODEL", "gpt-4o")
        return _extract_with_openai(image_bytes, mime_type, openai_key, openai_model)

    else:
        raise ValueError(f"Unsupported AI provider: {selected_provider}. Choose 'gemini' or 'openai'.")
