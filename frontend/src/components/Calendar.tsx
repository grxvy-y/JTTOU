import { useState, useEffect, useMemo } from 'react'
import type {
  WeatherData,
  Shift,
  DayOffWeather,
} from '../services/api'
import {
  fetchCurrentWeather,
  fetchWeatherForecast,
  fetchDaysOffWeather,
  fetchShifts,
} from '../services/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const YEAR_RANGE_BEHIND = 5
const YEAR_RANGE_AHEAD = 10

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function buildYearList(current: number): number[] {
  const years: number[] = []
  for (let y = current - YEAR_RANGE_BEHIND; y <= current + YEAR_RANGE_AHEAD; y++) {
    years.push(y)
  }
  return years
}

function toDateKey(year: number, monthZeroIndexed: number, day: number): string {
  const m = String(monthZeroIndexed + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function isSameDay(d1: Date, y: number, m: number, d: number) {
  return d1.getFullYear() === y && d1.getMonth() === m && d1.getDate() === d
}

// ─── Inline Style Tokens ──────────────────────────────────────────────────────

const accent = 'var(--color-accent)'
const primary = 'var(--color-primary)'
const text = 'var(--color-text)'
const font = "'ADLaM Display', cursive"

// ─── Sub-Components ───────────────────────────────────────────────────────────

/** Arrow button used for prev/next month */
function ArrowBtn({
  dir, onClick, disabled,
}: { dir: 'left' | 'right'; onClick: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'left' ? 'Previous month' : 'Next month'}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '32px', height: '32px',
        borderRadius: '10px',
        border: `1px solid ${hov ? 'rgba(47,43,64,0.28)' : 'rgba(47,43,64,0.12)'}`,
        background: hov ? 'rgba(47,43,64,0.08)' : 'rgba(254,250,255,0.50)',
        color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'all 0.15s ease',
        flexShrink: 0,
        fontSize: '16px',
      }}
    >
      {dir === 'left' ? '‹' : '›'}
    </button>
  )
}

/** Styled select dropdown */
function StyledSelect({
  value, onChange, options, ariaLabel,
}: {
  value: string | number
  onChange: (v: string) => void
  options: { value: string | number; label: string }[]
  ariaLabel: string
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'rgba(254,250,255,0.65)',
          border: '1px solid rgba(47,43,64,0.16)',
          borderRadius: '10px',
          color: accent,
          fontFamily: font,
          fontSize: '0.95rem',
          fontWeight: 400,
          padding: '6px 30px 6px 12px',
          cursor: 'pointer',
          outline: 'none',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(47,43,64,0.40)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(47,43,64,0.16)')}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: accent, fontSize: '11px', opacity: 0.6,
      }}>▾</span>
    </div>
  )
}

/** Individual Day Cell with integrated weather & shift indicators */
function DayCell({
  day, isCurrentMonth, today, selected, weather, shift, onClick,
}: {
  day: number | null
  isCurrentMonth: boolean
  today: boolean
  selected: boolean
  weather?: WeatherData | null
  shift?: Shift | null
  onClick?: () => void
}) {
  const [hov, setHov] = useState(false)

  if (day === null) {
    return <div style={{ minHeight: '52px', borderRadius: '12px' }} />
  }

  let bg = 'transparent'
  let color = isCurrentMonth ? text : 'rgba(57,61,59,0.25)'
  let border = '1px solid transparent'
  let fontWeight: React.CSSProperties['fontWeight'] = 400
  let shadow = 'none'

  if (today) {
    bg = accent
    color = primary
    border = `1px solid ${accent}`
    fontWeight = 700
    shadow = '0 3px 10px rgba(47,43,64,0.25)'
  } else if (selected) {
    bg = 'rgba(47,43,64,0.14)'
    border = `1px solid rgba(47,43,64,0.35)`
    color = accent
    fontWeight = 600
    shadow = '0 2px 8px rgba(47,43,64,0.08)'
  } else if (hov && isCurrentMonth) {
    bg = 'rgba(47,43,64,0.07)'
    border = '1px solid rgba(47,43,64,0.18)'
    color = accent
  }

  const isDayOff = shift?.is_day_off

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label={`Day ${day}`}
      aria-pressed={selected}
      style={{
        minHeight: '52px',
        borderRadius: '12px',
        border,
        background: bg,
        color,
        fontFamily: font,
        fontSize: '0.82rem',
        fontWeight,
        cursor: isCurrentMonth ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 2px 3px',
        transition: 'all 0.15s ease',
        boxShadow: shadow,
        width: '100%',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Day number */}
      <span style={{ lineHeight: 1 }}>{day}</span>

      {/* Middle indicator: Weather badge or Day Off emoji */}
      {isCurrentMonth && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          minHeight: '16px',
        }}>
          {weather ? (
            <span
              title={`${weather.condition}: ${Math.round(weather.temp)}°`}
              style={{
                fontSize: '0.68rem',
                lineHeight: 1,
                opacity: today ? 0.95 : 0.85,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1px',
              }}
            >
              <span>{weather.emoji}</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 600 }}>
                {Math.round(weather.temp)}°
              </span>
            </span>
          ) : isDayOff ? (
            <span title="Day Off 💕" style={{ fontSize: '0.68rem', lineHeight: 1 }}>
              💕
            </span>
          ) : shift ? (
            <span title="Work shift" style={{ fontSize: '0.65rem', lineHeight: 1 }}>
              💼
            </span>
          ) : null}
        </div>
      )}

      {/* Bottom dot indicator */}
      {isCurrentMonth && (
        <div style={{ display: 'flex', gap: '2px', height: '4px', alignItems: 'center' }}>
          {isDayOff && (
            <span style={{
              width: '4px', height: '4px', borderRadius: '50%',
              backgroundColor: today ? '#FEFAFF' : '#b05a7a',
            }} />
          )}
          {shift && !isDayOff && (
            <span style={{
              width: '4px', height: '4px', borderRadius: '50%',
              backgroundColor: today ? '#FEFAFF' : '#5a7aaa',
            }} />
          )}
        </div>
      )}
    </button>
  )
}

// ─── Main Calendar Component ─────────────────────────────────────────────────

export default function Calendar() {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-indexed
  const [selected, setSelected] = useState<{ y: number; m: number; d: number }>({
    y: now.getFullYear(),
    m: now.getMonth(),
    d: now.getDate(),
  })

  // Weather and Shift state
  const [city, setCity] = useState('Toronto')
  const [isEditingCity, setIsEditingCity] = useState(false)
  const [tempCity, setTempCity] = useState('Toronto')
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null)
  const [forecast, setForecast] = useState<WeatherData[]>([])
  const [daysOffWeather, setDaysOffWeather] = useState<DayOffWeather[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [weatherNotice, setWeatherNotice] = useState<string | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)

  // ── Fetch Weather & Shift Data ──
  const loadData = async (targetCity: string) => {
    setLoadingWeather(true)
    try {
      const [curRes, foreRes, daysOffRes, shiftsData] = await Promise.all([
        fetchCurrentWeather(targetCity),
        fetchWeatherForecast(targetCity),
        fetchDaysOffWeather(targetCity),
        fetchShifts(),
      ])

      if (curRes.data) setCurrentWeather(curRes.data)
      if (foreRes.data) setForecast(foreRes.data)
      if (daysOffRes.data) setDaysOffWeather(daysOffRes.data)
      if (shiftsData) setShifts(shiftsData)

      if (curRes.error) {
        setWeatherNotice(curRes.error)
      } else {
        setWeatherNotice(null)
      }
    } catch (err: any) {
      console.warn('Weather data loading error:', err)
      setWeatherNotice('Could not load live weather.')
    } finally {
      setLoadingWeather(false)
    }
  }

  useEffect(() => {
    loadData(city)
  }, [city])

  // ── Forecast Lookup Map (key: YYYY-MM-DD) ──
  const forecastMap = useMemo(() => {
    const map = new Map<string, WeatherData>()
    forecast.forEach(item => {
      if (item.date) map.set(item.date, item)
    })
    return map
  }, [forecast])

  // ── Shifts Lookup Map (key: YYYY-MM-DD) ──
  const shiftsMap = useMemo(() => {
    const map = new Map<string, Shift>()
    shifts.forEach(s => {
      if (s.shift_date) map.set(s.shift_date, s)
    })
    return map
  }, [shifts])

  // ── Selected Date Derived Information ──
  const selectedKey = toDateKey(selected.y, selected.m, selected.d)
  const selectedShift = shiftsMap.get(selectedKey)
  const selectedWeather = forecastMap.get(selectedKey) || (
    isSameDay(now, selected.y, selected.m, selected.d) ? currentWeather : null
  )

  // ── Navigation Helpers ──
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else { setViewMonth(m => m - 1) }
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else { setViewMonth(m => m + 1) }
  }

  // ── Build Grid Cells ──
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1,
  )

  const cells: { day: number; isCurrentMonth: boolean; key: string }[] = []
  // Leading cells
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ day: d, isCurrentMonth: false, key: toDateKey(y, m, d) })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, key: toDateKey(viewYear, viewMonth, d) })
  }
  // Trailing cells
  let trailing = 1
  while (cells.length < 42) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1
    const y = viewMonth === 11 ? viewYear + 1 : viewYear
    cells.push({ day: trailing++, isCurrentMonth: false, key: toDateKey(y, m, trailing - 1) })
  }

  const years = buildYearList(now.getFullYear())
  const monthOptions = MONTHS.map((m, i) => ({ value: i, label: m }))
  const yearOptions = years.map(y => ({ value: y, label: String(y) }))

  const handleCitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tempCity.trim()) {
      setCity(tempCity.trim())
      setIsEditingCity(false)
    }
  }

  return (
    <section
      id="calendar"
      style={{
        width: '100%',
        maxWidth: '680px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* ── Weather Ribbon & City Bar ── */}
      <div style={{
        borderRadius: '16px',
        background: 'rgba(254,250,255,0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(47,43,64,0.10)',
        boxShadow: '0 2px 20px rgba(47,43,64,0.06)',
        padding: '14px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        {/* City and Condition */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>
            {currentWeather ? currentWeather.emoji : '🌤️'}
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isEditingCity ? (
                <form onSubmit={handleCitySubmit} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="text"
                    value={tempCity}
                    onChange={e => setTempCity(e.target.value)}
                    placeholder="Enter city..."
                    style={{
                      fontFamily: font,
                      fontSize: '0.9rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(47,43,64,0.3)',
                      outline: 'none',
                      background: 'rgba(255,255,255,0.8)',
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    style={{
                      border: 'none',
                      background: accent,
                      color: primary,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontFamily: font,
                    }}
                  >
                    Set
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingCity(false)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: accent,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      opacity: 0.6,
                    }}
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => { setTempCity(city); setIsEditingCity(true) }}
                  title="Click to change city"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: font,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: accent,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <span>{currentWeather?.city || city}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.5 }}>✏️</span>
                </button>
              )}
            </div>
            <p style={{
              margin: 0,
              fontSize: '0.75rem',
              color: text,
              opacity: 0.7,
              textTransform: 'capitalize',
            }}>
              {currentWeather ? currentWeather.description : 'Loading live weather...'}
            </p>
          </div>
        </div>

        {/* Temperature & Quick Stats */}
        {currentWeather && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontFamily: font,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: accent,
                lineHeight: 1,
              }}>
                {Math.round(currentWeather.temp)}°C
              </span>
              <div style={{ fontSize: '0.68rem', color: text, opacity: 0.65 }}>
                Feels {Math.round(currentWeather.feels_like)}° • H: {Math.round(currentWeather.temp_max)}° L: {Math.round(currentWeather.temp_min)}°
              </div>
            </div>
            <button
              onClick={() => loadData(city)}
              disabled={loadingWeather}
              title="Refresh weather"
              style={{
                background: 'rgba(47,43,64,0.06)',
                border: '1px solid rgba(47,43,64,0.12)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                color: accent,
                transition: 'transform 0.2s',
                transform: loadingWeather ? 'rotate(180deg)' : 'none',
              }}
            >
              🔄
            </button>
          </div>
        )}
      </div>

      {/* Notice Banner (if running in mock/demo mode or notice) */}
      {weatherNotice && (
        <div style={{
          padding: '8px 16px',
          borderRadius: '12px',
          background: 'rgba(250, 241, 232, 0.7)',
          border: '1px solid rgba(176, 90, 122, 0.2)',
          color: accent,
          fontSize: '0.74rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>💡</span>
          <span style={{ flex: 1 }}>{weatherNotice}</span>
        </div>
      )}

      {/* ── Main Calendar Card ── */}
      <div style={{
        borderRadius: '20px',
        background: 'rgba(254,250,255,0.48)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(47,43,64,0.10)',
        boxShadow: '0 4px 40px rgba(47,43,64,0.08)',
        overflow: 'hidden',
      }}>
        {/* Header Controls */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px 10px',
          borderBottom: '1px solid rgba(47,43,64,0.07)',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <ArrowBtn dir="left" onClick={prevMonth} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <StyledSelect
              ariaLabel="Select month"
              value={viewMonth}
              onChange={v => setViewMonth(Number(v))}
              options={monthOptions}
            />
            <StyledSelect
              ariaLabel="Select year"
              value={viewYear}
              onChange={v => setViewYear(Number(v))}
              options={yearOptions}
            />
          </div>

          <ArrowBtn dir="right" onClick={nextMonth} />
        </div>

        {/* Day-of-Week Labels */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          padding: '12px 12px 4px',
        }}>
          {DAYS.map(d => (
            <div key={d} style={{
              textAlign: 'center',
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: accent,
              opacity: 0.45,
              fontFamily: font,
              paddingBottom: '4px',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          padding: '2px 12px 14px',
        }}>
          {cells.map((cell, idx) => {
            const isTodayDate = cell.isCurrentMonth && isSameDay(now, viewYear, viewMonth, cell.day)
            const isSel = selected.y === viewYear && selected.m === viewMonth && selected.d === cell.day && cell.isCurrentMonth
            const dayWeather = cell.isCurrentMonth ? forecastMap.get(cell.key) || (isTodayDate ? currentWeather : null) : null
            const dayShift = cell.isCurrentMonth ? shiftsMap.get(cell.key) : null

            return (
              <DayCell
                key={idx}
                day={cell.day}
                isCurrentMonth={cell.isCurrentMonth}
                today={isTodayDate}
                selected={isSel}
                weather={dayWeather}
                shift={dayShift}
                onClick={cell.isCurrentMonth ? () => setSelected({ y: viewYear, m: viewMonth, d: cell.day }) : undefined}
              />
            )
          })}
        </div>

        {/* ── Interactive Selected Day Weather & Shift Card ── */}
        <div style={{
          borderTop: '1px solid rgba(47,43,64,0.08)',
          background: 'rgba(254,250,255,0.7)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Date title & Day Off / Shift Tag */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <div>
              <span style={{
                fontFamily: font,
                fontSize: '0.95rem',
                fontWeight: 700,
                color: accent,
              }}>
                {MONTHS[selected.m]} {selected.d}, {selected.y}
              </span>
              {isSameDay(now, selected.y, selected.m, selected.d) && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '0.68rem',
                  background: 'rgba(47,43,64,0.08)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  color: accent,
                }}>
                  Today
                </span>
              )}
            </div>

            {/* Shift status pill */}
            {selectedShift?.is_day_off ? (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                background: '#b05a7a18',
                border: '1px solid #b05a7a35',
                color: '#b05a7a',
                padding: '3px 10px',
                borderRadius: '999px',
              }}>
                💕 Day Off — Date Ready!
              </span>
            ) : selectedShift?.start_time ? (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                background: '#5a7aaa18',
                border: '1px solid #5a7aaa35',
                color: '#5a7aaa',
                padding: '3px 10px',
                borderRadius: '999px',
              }}>
                💼 Shift: {selectedShift.start_time} – {selectedShift.end_time || 'Done'}
              </span>
            ) : (
              <span style={{
                fontSize: '0.72rem',
                color: text,
                opacity: 0.5,
              }}>
                No shifts recorded
              </span>
            )}
          </div>

          {/* Weather details for selected day */}
          {selectedWeather ? (
            <div style={{
              borderRadius: '12px',
              background: 'rgba(254,250,255,0.85)',
              border: '1px solid rgba(47,43,64,0.1)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>{selectedWeather.emoji}</span>
                <div>
                  <div style={{
                    fontFamily: font,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: accent,
                    lineHeight: 1,
                  }}>
                    {Math.round(selectedWeather.temp)}°C
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, marginLeft: '6px', opacity: 0.75 }}>
                      {selectedWeather.condition}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: text, opacity: 0.65, marginTop: '2px' }}>
                    {selectedWeather.description} • Feels like {Math.round(selectedWeather.feels_like)}°C
                  </div>
                </div>
              </div>

              {/* Stats badges */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  fontSize: '0.7rem',
                  color: text,
                  opacity: 0.8,
                  background: 'rgba(47,43,64,0.05)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}>
                  💧 {selectedWeather.humidity}% Humidity
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: text,
                  opacity: 0.8,
                  background: 'rgba(47,43,64,0.05)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}>
                  💨 {selectedWeather.wind_speed} m/s
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              borderRadius: '12px',
              background: 'rgba(47,43,64,0.03)',
              padding: '10px 14px',
              fontSize: '0.74rem',
              color: text,
              opacity: 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>ℹ️</span>
              <span>
                Weather forecast is available within 5 days of today ({city}).
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Upcoming Days Off & Weather (Date-Planning Ribbon) ── */}
      {daysOffWeather.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: '4px',
          }}>
            <span style={{
              fontFamily: font,
              fontSize: '0.85rem',
              color: accent,
              opacity: 0.75,
              letterSpacing: '0.04em',
            }}>
              Upcoming Days Off 💕
            </span>
            <span style={{ fontSize: '0.72rem', color: text, opacity: 0.5 }}>
              Perfect dates ahead
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
          }}>
            {daysOffWeather.slice(0, 4).map((dOff, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: '14px',
                  background: 'rgba(254,250,255,0.5)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(47,43,64,0.10)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(47,43,64,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: font, fontSize: '0.78rem', color: accent }}>
                    {dOff.shift_date}
                  </span>
                  <span>💕</span>
                </div>

                {dOff.weather ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '18px' }}>{dOff.weather.emoji}</span>
                    <span style={{ fontFamily: font, fontSize: '0.85rem', fontWeight: 600, color: accent }}>
                      {Math.round(dOff.weather.temp)}°C
                    </span>
                    <span style={{ fontSize: '0.65rem', color: text, opacity: 0.6 }}>
                      {dOff.weather.condition}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.68rem', color: text, opacity: 0.5, marginTop: '4px' }}>
                    Future date planner
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
