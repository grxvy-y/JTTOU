// ─── Weather & Shift Types ──────────────────────────────────────────────────

export interface WeatherData {
  city: string
  date?: string | null // YYYY-MM-DD (null for current weather)
  temp: number
  feels_like: number
  temp_min: number
  temp_max: number
  condition: string // e.g. "Clear", "Clouds", "Rain", "Snow"
  description: string // e.g. "scattered clouds"
  emoji: string // e.g. "☀️", "🌧️", "☁️"
  icon_code: string // OpenWeatherMap icon code e.g. "01d"
  humidity: number
  wind_speed: number
  units: string // "metric" (°C) or "imperial" (°F)
}

export interface Shift {
  id?: number
  shift_date: string // YYYY-MM-DD
  start_time?: string | null
  end_time?: string | null
  is_day_off: boolean
  raw_text?: string | null
  created_at?: string
}

export interface DayOffWeather {
  shift_date: string // YYYY-MM-DD
  raw_text?: string | null
  weather: WeatherData | null
  forecast_available: boolean
}

export interface WeatherApiResponse<T> {
  data: T | null
  error: string | null
  isMock?: boolean
}

// ─── API Configuration ────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : '/api'
)

// ─── Mock Fallback Generator ─────────────────────────────────────────────────
// Used for previewing when backend or OPENWEATHER_API_KEY is not configured yet.

function formatDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMockCurrentWeather(city = 'Toronto'): WeatherData {
  return {
    city,
    date: null,
    temp: 21.5,
    feels_like: 22.0,
    temp_min: 17.0,
    temp_max: 24.0,
    condition: 'Clear',
    description: 'sunny & pleasant',
    emoji: '☀️',
    icon_code: '01d',
    humidity: 55,
    wind_speed: 3.6,
    units: 'metric',
  }
}

export function getMockForecast(city = 'Toronto'): WeatherData[] {
  const now = new Date()
  const samples = [
    { cond: 'Clear',  desc: 'sunny',            emoji: '☀️', icon: '01d', min: 16, max: 24, temp: 21 },
    { cond: 'Clouds', desc: 'scattered clouds', emoji: '⛅', icon: '02d', min: 15, max: 22, temp: 19 },
    { cond: 'Rain',   desc: 'light rain',       emoji: '🌧️', icon: '10d', min: 13, max: 18, temp: 16 },
    { cond: 'Clear',  desc: 'clear sky',        emoji: '☀️', icon: '01d', min: 14, max: 23, temp: 20 },
    { cond: 'Clouds', desc: 'overcast clouds',  emoji: '☁️', icon: '04d', min: 12, max: 19, temp: 17 },
  ]

  return samples.map((sample, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    return {
      city,
      date: formatDateStr(d),
      temp: sample.temp,
      feels_like: sample.temp + 1,
      temp_min: sample.min,
      temp_max: sample.max,
      condition: sample.cond,
      description: sample.desc,
      emoji: sample.emoji,
      icon_code: sample.icon,
      humidity: 50 + i * 5,
      wind_speed: 3.0 + i * 0.5,
      units: 'metric',
    }
  })
}

// ─── API Client Functions ─────────────────────────────────────────────────────

async function safeFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  })
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`
    try {
      const errJson = await res.json()
      if (errJson.detail) errMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg)
  }
  return res.json()
}

/**
 * Fetch current real-time weather from backend.
 * Falls back to mock data if the API key is not configured or server is unreachable.
 */
export async function fetchCurrentWeather(city?: string): Promise<WeatherApiResponse<WeatherData>> {
  const query = city ? `?city=${encodeURIComponent(city)}` : ''
  try {
    const data = await safeFetch<WeatherData>(`${API_BASE}/weather/current${query}`)
    return { data, error: null, isMock: false }
  } catch (err: any) {
    // Check if error is due to missing API key or offline backend
    const isApiKeyError = err?.message?.includes('OPENWEATHER_API_KEY')
    return {
      data: getMockCurrentWeather(city || 'Toronto'),
      error: isApiKeyError
        ? 'OpenWeatherMap API key not configured in backend/.env — showing demo weather.'
        : `Could not reach backend (${err?.message || 'Offline'}) — showing demo weather.`,
      isMock: true,
    }
  }
}

/**
 * Fetch 5-day daily aggregated weather forecast.
 */
export async function fetchWeatherForecast(city?: string): Promise<WeatherApiResponse<WeatherData[]>> {
  const query = city ? `?city=${encodeURIComponent(city)}` : ''
  try {
    const data = await safeFetch<WeatherData[]>(`${API_BASE}/weather/forecast${query}`)
    return { data, error: null, isMock: false }
  } catch (err: any) {
    const isApiKeyError = err?.message?.includes('OPENWEATHER_API_KEY')
    return {
      data: getMockForecast(city || 'Toronto'),
      error: isApiKeyError
        ? 'OpenWeatherMap API key not configured — showing demo forecast.'
        : `Backend offline — showing demo forecast.`,
      isMock: true,
    }
  }
}

/**
 * Fetch weather forecast for a specific date (YYYY-MM-DD).
 */
export async function fetchWeatherForDate(targetDate: string, city?: string): Promise<WeatherApiResponse<WeatherData>> {
  const query = city ? `?city=${encodeURIComponent(city)}` : ''
  try {
    const data = await safeFetch<WeatherData>(`${API_BASE}/weather/date/${targetDate}${query}`)
    return { data, error: null, isMock: false }
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'Weather not available for this date.',
      isMock: false,
    }
  }
}

/**
 * Fetch upcoming days off paired with weather forecasts.
 */
export async function fetchDaysOffWeather(city?: string): Promise<WeatherApiResponse<DayOffWeather[]>> {
  const query = city ? `?city=${encodeURIComponent(city)}` : ''
  try {
    const data = await safeFetch<DayOffWeather[]>(`${API_BASE}/weather/days-off${query}`)
    return { data, error: null, isMock: false }
  } catch (err: any) {
    return {
      data: [],
      error: err?.message || 'Could not load days off weather.',
      isMock: true,
    }
  }
}

/**
 * Fetch all saved shifts from the database.
 */
export async function fetchShifts(): Promise<Shift[]> {
  try {
    return await safeFetch<Shift[]>(`${API_BASE}/shifts/`)
  } catch (err) {
    console.warn('Failed to load shifts from backend:', err)
    return []
  }
}
