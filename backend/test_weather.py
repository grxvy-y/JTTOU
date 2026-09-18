import os
import unittest
from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from database.db import get_session
from database.models import Shift
from services.weather import (
    WeatherData,
    DayOffWeather,
    CONDITION_EMOJI,
    _parse_current_weather,
    _aggregate_forecast_day,
    get_current_weather,
    get_forecast,
    get_weather_for_date,
    pair_days_off_with_weather,
)


class TestWeatherUnitLogic(unittest.TestCase):
    """Unit tests for weather data structures, parsing, and aggregation logic."""

    def test_condition_emojis_coverage(self):
        """Verify standard weather conditions map to expected emojis."""
        self.assertEqual(CONDITION_EMOJI["Clear"], "☀️")
        self.assertEqual(CONDITION_EMOJI["Clouds"], "☁️")
        self.assertEqual(CONDITION_EMOJI["Rain"], "🌧️")
        self.assertEqual(CONDITION_EMOJI["Snow"], "🌨️")
        self.assertEqual(CONDITION_EMOJI["Thunderstorm"], "⛈️")

    def test_weather_data_instantiation(self):
        """Verify WeatherData model validates properly."""
        data = WeatherData(
            city="Toronto",
            date="2026-09-18",
            temp=20.5,
            feels_like=21.0,
            temp_min=18.0,
            temp_max=23.0,
            condition="Clear",
            description="clear sky",
            emoji="☀️",
            icon_code="01d",
            humidity=55,
            wind_speed=3.5,
            units="metric",
        )
        self.assertEqual(data.city, "Toronto")
        self.assertEqual(data.temp, 20.5)
        self.assertEqual(data.emoji, "☀️")

    def test_parse_current_weather(self):
        """Verify OpenWeatherMap raw JSON parses into WeatherData."""
        mock_raw = {
            "main": {
                "temp": 22.5,
                "feels_like": 23.0,
                "temp_min": 20.0,
                "temp_max": 25.0,
                "humidity": 60,
            },
            "weather": [
                {
                    "main": "Rain",
                    "description": "light rain",
                    "icon": "10d",
                }
            ],
            "wind": {"speed": 4.2},
        }
        parsed = _parse_current_weather(mock_raw, city="Toronto", units="metric")
        self.assertEqual(parsed.city, "Toronto")
        self.assertEqual(parsed.temp, 22.5)
        self.assertEqual(parsed.condition, "Rain")
        self.assertEqual(parsed.emoji, "🌧️")
        self.assertEqual(parsed.humidity, 60)
        self.assertEqual(parsed.wind_speed, 4.2)

    def test_aggregate_forecast_day(self):
        """Verify aggregation of multiple 3-hour forecast slots into a single daily summary."""
        mock_entries = [
            {
                "main": {"temp": 18.0, "feels_like": 17.5, "humidity": 70},
                "weather": [{"main": "Clouds", "description": "few clouds", "icon": "02d"}],
                "wind": {"speed": 3.0},
            },
            {
                "main": {"temp": 24.0, "feels_like": 24.5, "humidity": 50},
                "weather": [{"main": "Clear", "description": "clear sky", "icon": "01d"}],
                "wind": {"speed": 4.0},
            },
            {
                "main": {"temp": 21.0, "feels_like": 20.5, "humidity": 60},
                "weather": [{"main": "Clear", "description": "clear sky", "icon": "01d"}],
                "wind": {"speed": 3.5},
            },
        ]
        summary = _aggregate_forecast_day(mock_entries, "2026-09-19", "Toronto", "metric")
        self.assertEqual(summary.date, "2026-09-19")
        self.assertEqual(summary.temp_min, 18.0)
        self.assertEqual(summary.temp_max, 24.0)
        self.assertEqual(summary.condition, "Clear")  # Clear appeared 2 times, Clouds 1 time
        self.assertEqual(summary.emoji, "☀️")
        self.assertEqual(summary.temp, 21.0)  # Average of 18, 24, 21

    def test_get_weather_for_date_past_returns_none(self):
        """Historical dates should return None since free tier only offers forecasts."""
        past_date = date.today() - timedelta(days=2)
        result = get_weather_for_date(past_date)
        self.assertIsNone(result)

    def test_get_weather_for_date_far_future_returns_none(self):
        """Dates beyond 5 days should return None."""
        far_date = date.today() + timedelta(days=10)
        result = get_weather_for_date(far_date)
        self.assertIsNone(result)

    def test_missing_api_key_raises_value_error(self):
        """Missing API key should trigger clear ValueError."""
        with patch("services.weather.OPENWEATHER_API_KEY", None):
            with self.assertRaises(ValueError) as ctx:
                get_current_weather()
            self.assertIn("OPENWEATHER_API_KEY", str(ctx.exception))

    def test_pair_days_off_with_weather_mocked(self):
        """Verify batch pairing logic for days off."""
        today = date.today()
        future_in_range = today + timedelta(days=2)
        future_out_of_range = today + timedelta(days=20)

        mock_forecast = [
            WeatherData(
                city="Toronto",
                date=future_in_range.isoformat(),
                temp=22.0,
                feels_like=22.0,
                temp_min=18.0,
                temp_max=24.0,
                condition="Clear",
                description="sunny",
                emoji="☀️",
                icon_code="01d",
                humidity=50,
                wind_speed=2.0,
                units="metric",
            )
        ]

        with patch("services.weather.get_forecast", return_value=mock_forecast), \
             patch("services.weather.get_current_weather") as mock_cur:

            mock_cur.return_value = WeatherData(
                city="Toronto",
                date=today.isoformat(),
                temp=20.0,
                feels_like=20.0,
                temp_min=17.0,
                temp_max=21.0,
                condition="Clouds",
                description="cloudy",
                emoji="☁️",
                icon_code="03d",
                humidity=60,
                wind_speed=3.0,
                units="metric",
            )

            test_items = [
                {"shift_date": today, "raw_text": "OFF Today"},
                {"shift_date": future_in_range, "raw_text": "OFF In 2 Days"},
                {"shift_date": future_out_of_range, "raw_text": "OFF In 20 Days"},
            ]

            results = pair_days_off_with_weather(test_items)
            self.assertEqual(len(results), 3)

            # Today
            self.assertTrue(results[0].forecast_available)
            self.assertIsNotNone(results[0].weather)
            self.assertEqual(results[0].weather.condition, "Clouds")

            # In 2 days
            self.assertTrue(results[1].forecast_available)
            self.assertIsNotNone(results[1].weather)
            self.assertEqual(results[1].weather.condition, "Clear")

            # In 20 days (out of range)
            self.assertFalse(results[2].forecast_available)
            self.assertIsNone(results[2].weather)


class TestWeatherAPIEndpoints(unittest.TestCase):
    """Integration tests for FastAPI /weather router using TestClient."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        """Ensure base API is healthy."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})

    def test_get_current_weather_endpoint(self):
        """GET /weather/current returns 200 with required weather fields."""
        response = self.client.get("/weather/current")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("city", data)
        self.assertIn("temp", data)
        self.assertIn("condition", data)
        self.assertIn("emoji", data)
        self.assertIn("humidity", data)

    def test_get_current_weather_custom_city(self):
        """GET /weather/current?city=Tokyo returns weather for Tokyo."""
        response = self.client.get("/weather/current?city=Tokyo")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["city"], "Tokyo")

    def test_get_forecast_endpoint(self):
        """GET /weather/forecast returns 200 and a list of daily forecasts."""
        response = self.client.get("/weather/forecast")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        first_day = data[0]
        self.assertIn("date", first_day)
        self.assertIn("temp_min", first_day)
        self.assertIn("temp_max", first_day)
        self.assertIn("emoji", first_day)

    def test_get_weather_for_date_valid(self):
        """GET /weather/date/{today} returns 200 with weather."""
        today = date.today().isoformat()
        response = self.client.get(f"/weather/date/{today}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("temp", data)

    def test_get_weather_for_date_out_of_range_returns_404(self):
        """GET /weather/date/{far_future} returns 404."""
        far_future = (date.today() + timedelta(days=30)).isoformat()
        response = self.client.get(f"/weather/date/{far_future}")
        self.assertEqual(response.status_code, 404)
        self.assertIn("not available", response.json()["detail"])

    def test_get_days_off_weather_endpoint_real_db(self):
        """GET /weather/days-off returns 200 and a list."""
        response = self.client.get("/weather/days-off")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)

    def test_get_days_off_weather_with_mocked_session(self):
        """Verify /weather/days-off endpoint correctly formats and pairs database records."""
        today = date.today()
        mock_shift_upcoming = Shift(
            id=101,
            shift_date=today,
            is_day_off=True,
            raw_text="OFF DAY",
        )
        mock_shift_far = Shift(
            id=102,
            shift_date=today + timedelta(days=25),
            is_day_off=True,
            raw_text="VACATION",
        )

        mock_session = MagicMock()
        mock_session.exec.return_value.all.return_value = [
            mock_shift_upcoming,
            mock_shift_far,
        ]

        def override_get_session():
            yield mock_session

        app.dependency_overrides[get_session] = override_get_session
        try:
            response = self.client.get("/weather/days-off")
            self.assertEqual(response.status_code, 200)
            items = response.json()
            self.assertEqual(len(items), 2)
            # First item (today) should have forecast_available = True
            self.assertTrue(items[0]["forecast_available"])
            self.assertIsNotNone(items[0]["weather"])
            self.assertEqual(items[0]["raw_text"], "OFF DAY")

            # Second item (25 days out) should have forecast_available = False
            self.assertFalse(items[1]["forecast_available"])
            self.assertIsNone(items[1]["weather"])
            self.assertEqual(items[1]["raw_text"], "VACATION")
        finally:
            app.dependency_overrides.clear()


if __name__ == "__main__":
    unittest.main()
