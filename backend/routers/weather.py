from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Path, Depends
from sqlmodel import Session, select

from database.db import get_session
from database.models import Shift
from services.weather import (
    WeatherData,
    DayOffWeather,
    get_current_weather,
    get_forecast,
    get_weather_for_date,
    pair_days_off_with_weather,
)

# All weather endpoints grouped under /weather
router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/current", response_model=WeatherData, summary="Get current weather")
def current_weather(
    city: Optional[str] = Query(
        default=None,
        description="City name to fetch weather for. Defaults to DEFAULT_CITY from .env if omitted.",
        examples=["Toronto", "New York", "London"],
    )
):
    """
    Fetch real-time current weather conditions for the specified or default city.
    Includes temperature, feels-like, min/max, condition, emoji, humidity, and wind speed.
    """
    try:
        return get_current_weather(city=city)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch current weather: {str(e)}"
        )


@router.get("/forecast", response_model=list[WeatherData], summary="Get 5-day daily forecast")
def forecast_weather(
    city: Optional[str] = Query(
        default=None,
        description="City name to fetch 5-day forecast for. Defaults to DEFAULT_CITY if omitted.",
        examples=["Toronto"],
    )
):
    """
    Fetch 5-day daily aggregated weather forecast for the specified or default city.
    Aggregates high/low temperatures, dominant conditions, and daily averages.
    """
    try:
        return get_forecast(city=city)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weather forecast: {str(e)}"
        )


@router.get("/date/{target_date}", response_model=WeatherData, summary="Get weather for a specific date")
def weather_for_date(
    target_date: date = Path(
        ...,
        description="Target date in YYYY-MM-DD format (must be within the next 5 days).",
        examples=["2026-09-18"],
    ),
    city: Optional[str] = Query(
        default=None,
        description="City name to fetch weather for.",
    )
):
    """
    Fetch weather forecast for a single specific date.
    Returns 404 if the date is in the past or beyond the 5-day forecast horizon.
    """
    try:
        weather = get_weather_for_date(target_date=target_date, city=city)
        if weather is None:
            raise HTTPException(
                status_code=404,
                detail=f"Weather forecast is not available for date {target_date}. OpenWeather provides forecasts for up to 5 days ahead."
            )
        return weather
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weather for {target_date}: {str(e)}"
        )


@router.get("/days-off", response_model=list[DayOffWeather], summary="Get weather for upcoming days off")
def days_off_weather(
    city: Optional[str] = Query(
        default=None,
        description="City name to fetch weather for. Defaults to DEFAULT_CITY if omitted.",
    ),
    include_past: bool = Query(
        default=False,
        description="If True, includes past days off (which will have no weather forecast). If False, only queries today and future days off.",
    ),
    session: Session = Depends(get_session),
):
    """
    Query saved days off from the database and automatically pair each one with its
    corresponding weather forecast. Makes a single batch forecast call for efficiency.
    """
    try:
        query = select(Shift).where(Shift.is_day_off == True)
        if not include_past:
            query = query.where(Shift.shift_date >= date.today())
        
        query = query.order_by(Shift.shift_date)
        days_off = session.exec(query).all()

        if not days_off:
            return []

        # Batch pair days off with weather forecast in a single API call
        return pair_days_off_with_weather(days_off=days_off, city=city)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weather for days off: {str(e)}"
        )
