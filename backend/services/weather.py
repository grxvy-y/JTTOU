import os
import json
import urllib.request
import urllib.error
from datetime import date as DateType, datetime
from typing import Optional, Union, Any
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# ─── OpenWeatherMap Configuration ────────────────────────────────────────────
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
DEFAULT_CITY = os.getenv("DEFAULT_CITY", "Toronto")
WEATHER_UNITS = os.getenv("WEATHER_UNITS", "metric")  # metric = °C, imperial = °F

# Map OpenWeatherMap "main" condition strings to emojis for quick visual display
CONDITION_EMOJI = {
    "Clear":        "☀️",
    "Clouds":       "☁️",
    "Rain":         "🌧️",
    "Drizzle":      "🌦️",
    "Thunderstorm": "⛈️",
    "Snow":         "🌨️",
    "Mist":         "🌫️",
    "Fog":          "🌫️",
    "Haze":         "🌫️",
    "Smoke":        "🌫️",
    "Dust":         "🌫️",
    "Tornado":      "🌪️",
}


# ─── Pydantic Data Models ────────────────────────────────────────────────────

class WeatherData(BaseModel):
    """Weather snapshot for a single point in time or a daily summary."""
    city: str
    date: Optional[str] = Field(default=None, description="Date string YYYY-MM-DD (None for current weather)")
    temp: float = Field(description="Current or average temperature")
    feels_like: float = Field(description="'Feels like' temperature")
    temp_min: float = Field(description="Daily minimum temperature")
    temp_max: float = Field(description="Daily maximum temperature")
    condition: str = Field(description="Main weather condition (e.g. Clear, Rain, Clouds)")
    description: str = Field(description="Detailed description (e.g. 'scattered clouds')")
    emoji: str = Field(description="Weather condition emoji")
    icon_code: str = Field(description="OpenWeatherMap icon code (e.g. '01d')")
    humidity: int = Field(description="Humidity percentage")
    wind_speed: float = Field(description="Wind speed in m/s (metric) or mph (imperial)")
    units: str = Field(default="metric", description="Temperature unit system: metric (°C) or imperial (°F)")


class DayOffWeather(BaseModel):
    """Pairs a day off date with its weather forecast for date-planning."""
    shift_date: DateType
    raw_text: Optional[str] = Field(default=None, description="Original roster text for this day")
    weather: Optional[WeatherData] = Field(default=None, description="Weather forecast (None if date is beyond forecast range)")
    forecast_available: bool = Field(default=True, description="False if the date is too far out for a forecast")


# ─── Internal Helpers ────────────────────────────────────────────────────────

def _make_request(url: str) -> dict:
    """Make an HTTP GET request and return parsed JSON. Raises on HTTP errors."""
    req = urllib.request.Request(url, headers={"User-Agent": "PookieCalendar/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _parse_current_weather(data: dict, city: str, units: str) -> WeatherData:
    """Parse the OpenWeatherMap current weather API response into WeatherData."""
    main = data["main"]
    weather_block = data["weather"][0]
    wind = data.get("wind", {})
    condition = weather_block["main"]

    return WeatherData(
        city=city,
        date=None,
        temp=main["temp"],
        feels_like=main["feels_like"],
        temp_min=main["temp_min"],
        temp_max=main["temp_max"],
        condition=condition,
        description=weather_block["description"],
        emoji=CONDITION_EMOJI.get(condition, "🌡️"),
        icon_code=weather_block["icon"],
        humidity=main["humidity"],
        wind_speed=wind.get("speed", 0),
        units=units,
    )


def _aggregate_forecast_day(entries: list[dict], target_date: str, city: str, units: str) -> WeatherData:
    """
    Aggregate multiple 3-hour forecast entries for a single day into one WeatherData summary.
    Uses min/max temps across all entries, and picks the most common weather condition.
    """
    temps = [e["main"]["temp"] for e in entries]
    feels = [e["main"]["feels_like"] for e in entries]
    humidities = [e["main"]["humidity"] for e in entries]
    wind_speeds = [e.get("wind", {}).get("speed", 0) for e in entries]

    # Pick the most common weather condition across the day's time slots
    conditions = [e["weather"][0]["main"] for e in entries]
    condition = max(set(conditions), key=conditions.count)

    # Find a matching entry for the description and icon
    representative = next(
        (e for e in entries if e["weather"][0]["main"] == condition),
        entries[len(entries) // 2],  # fallback to midday entry
    )

    return WeatherData(
        city=city,
        date=target_date,
        temp=round(sum(temps) / len(temps), 1),
        feels_like=round(sum(feels) / len(feels), 1),
        temp_min=round(min(temps), 1),
        temp_max=round(max(temps), 1),
        condition=condition,
        description=representative["weather"][0]["description"],
        emoji=CONDITION_EMOJI.get(condition, "🌡️"),
        icon_code=representative["weather"][0]["icon"],
        humidity=round(sum(humidities) / len(humidities)),
        wind_speed=round(sum(wind_speeds) / len(wind_speeds), 1),
        units=units,
    )


# ─── Public API Functions ────────────────────────────────────────────────────

def get_current_weather(city: Optional[str] = None) -> WeatherData:
    """
    Fetch current real-time weather from OpenWeatherMap.
    Falls back to DEFAULT_CITY if no city is specified.
    """
    if not OPENWEATHER_API_KEY:
        raise ValueError("OPENWEATHER_API_KEY is not set in backend/.env")

    city = city or DEFAULT_CITY
    units = WEATHER_UNITS

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?q={urllib.request.quote(city)}"
        f"&appid={OPENWEATHER_API_KEY}"
        f"&units={units}"
    )

    try:
        data = _make_request(url)
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise ValueError(
                "OpenWeatherMap API key is invalid or still activating. "
                "New keys take up to 30–60 minutes to propagate. Please wait and try again."
            )
        raise RuntimeError(f"OpenWeatherMap API error ({e.code}): {e.read().decode()}")

    return _parse_current_weather(data, city, units)


def get_forecast(city: Optional[str] = None) -> list[WeatherData]:
    """
    Fetch the 5-day / 3-hour forecast from OpenWeatherMap and aggregate into daily summaries.
    Returns a list of WeatherData, one per day (up to 5 days).
    """
    if not OPENWEATHER_API_KEY:
        raise ValueError("OPENWEATHER_API_KEY is not set in backend/.env")

    city = city or DEFAULT_CITY
    units = WEATHER_UNITS

    url = (
        f"https://api.openweathermap.org/data/2.5/forecast"
        f"?q={urllib.request.quote(city)}"
        f"&appid={OPENWEATHER_API_KEY}"
        f"&units={units}"
    )

    try:
        data = _make_request(url)
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise ValueError(
                "OpenWeatherMap API key is invalid or still activating. "
                "New keys take up to 30–60 minutes to propagate."
            )
        raise RuntimeError(f"OpenWeatherMap API error ({e.code}): {e.read().decode()}")

    # Group the 3-hour forecast entries by date
    entries_by_date: dict[str, list[dict]] = {}
    for entry in data.get("list", []):
        dt_txt = entry["dt_txt"]  # format: "2026-09-18 12:00:00"
        day_str = dt_txt.split(" ")[0]
        entries_by_date.setdefault(day_str, []).append(entry)

    # Aggregate each day into a single WeatherData summary
    daily_forecasts = []
    for day_str in sorted(entries_by_date.keys()):
        daily_forecasts.append(
            _aggregate_forecast_day(entries_by_date[day_str], day_str, city, units)
        )

    return daily_forecasts


def get_weather_for_date(target_date: DateType, city: Optional[str] = None) -> Optional[WeatherData]:
    """
    Get the weather forecast for a specific date.
    Returns None if the date is beyond the 5-day forecast window.
    Uses current weather if the target date is today.
    """
    today = DateType.today()

    if target_date == today:
        return get_current_weather(city)

    if target_date < today:
        # Past dates — no historical weather via free tier
        return None

    # Future date — check if within 5-day forecast range
    days_ahead = (target_date - today).days
    if days_ahead > 5:
        return None

    # Fetch forecast and find the matching day
    forecast = get_forecast(city)
    target_str = target_date.isoformat()  # YYYY-MM-DD
    for day_weather in forecast:
        if day_weather.date == target_str:
            return day_weather

    return None


def pair_days_off_with_weather(
    days_off: list[Any],
    city: Optional[str] = None
) -> list[DayOffWeather]:
    """
    Given a list of day-off items (which can be Shift models, dicts, or date objects),
    pairs each with its corresponding weather forecast using a single batch forecast call.
    Returns a list of DayOffWeather objects.
    """
    if not days_off:
        return []

    # Fetch 5-day forecast once for the entire batch
    forecast_list = get_forecast(city)
    forecast_map = {f.date: f for f in forecast_list}

    # Also grab current weather for today if present
    today = DateType.today()
    today_str = today.isoformat()
    if today_str not in forecast_map:
        try:
            today_weather = get_current_weather(city)
            today_weather.date = today_str
            forecast_map[today_str] = today_weather
        except Exception:
            pass

    results: list[DayOffWeather] = []
    for item in days_off:
        # Extract shift_date and raw_text regardless of whether item is a model or dict
        if hasattr(item, "shift_date"):
            s_date = getattr(item, "shift_date")
            raw = getattr(item, "raw_text", None)
        elif isinstance(item, dict):
            s_date = item.get("shift_date")
            raw = item.get("raw_text")
        elif isinstance(item, DateType):
            s_date = item
            raw = None
        else:
            continue

        if isinstance(s_date, str):
            s_date = DateType.fromisoformat(s_date)

        date_key = s_date.isoformat()
        weather = forecast_map.get(date_key)
        results.append(
            DayOffWeather(
                shift_date=s_date,
                raw_text=raw,
                weather=weather,
                forecast_available=weather is not None,
            )
        )

    return results

