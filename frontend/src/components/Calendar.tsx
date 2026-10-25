import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
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

// ─── Extended Shift Type ─────────────────────────────────────────────────────

export interface LocalShift extends Shift {
  label?: string
  notes?: string
  event_type?: 'work' | 'day_off' | 'personal'
}

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

function getWeekBounds(year: number, month: number, day: number) {
  const date = new Date(year, month, day)
  const dow = date.getDay()
  const sun = new Date(date); sun.setDate(date.getDate() - dow)
  const keys: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sun); d.setDate(sun.getDate() + i)
    const m0 = String(d.getMonth() + 1).padStart(2, '0')
    const d0 = String(d.getDate()).padStart(2, '0')
    keys.push(`${d.getFullYear()}-${m0}-${d0}`)
  }
  return keys
}

// ─── Inline Style Tokens ──────────────────────────────────────────────────────

const accent  = 'var(--color-accent)'
const primary = 'var(--color-primary)'
const text    = 'var(--color-text)'
const font    = "'ADLaM Display', cursive"
const ease    = 'cubic-bezier(0.4, 0, 0.2, 1)'

// ─── Event type config ────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: 'work'     as const, label: 'Work shift',       icon: '💼', color: '#5a7aaa' },
  { value: 'day_off'  as const, label: 'Day off',           icon: '💕', color: '#b05a7a' },
  { value: 'personal' as const, label: 'Personal activity', icon: '🎉', color: '#7a9a5a' },
]

function getEventType(shift: LocalShift) {
  if (shift.event_type === 'personal') return EVENT_TYPES[2]
  if (shift.is_day_off || shift.event_type === 'day_off') return EVENT_TYPES[1]
  return EVENT_TYPES[0]
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ArrowBtn({ dir, onClick, disabled }: { dir: 'left' | 'right'; onClick: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'left' ? 'Previous month' : 'Next month'}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '32px', height: '32px', borderRadius: '10px',
        border: `1px solid ${hov ? 'rgba(47,43,64,0.28)' : 'rgba(47,43,64,0.12)'}`,
        background: hov ? 'rgba(47,43,64,0.08)' : 'rgba(254,250,255,0.50)',
        color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
        transition: 'all 0.15s ease', flexShrink: 0, fontSize: '16px',
      }}
    >
      {dir === 'left' ? '‹' : '›'}
    </button>
  )
}

function StyledSelect({ value, onChange, options, ariaLabel }: {
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
          appearance: 'none', WebkitAppearance: 'none',
          background: 'rgba(254,250,255,0.65)', border: '1px solid rgba(47,43,64,0.16)',
          borderRadius: '10px', color: accent, fontFamily: font, fontSize: '0.95rem',
          fontWeight: 400, padding: '6px 30px 6px 12px', cursor: 'pointer', outline: 'none',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(47,43,64,0.40)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(47,43,64,0.16)')}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: accent, fontSize: '11px', opacity: 0.6 }}>▾</span>
    </div>
  )
}

function DayCell({ day, isCurrentMonth, today, selected, weather, shift, onClick }: {
  day: number | null
  isCurrentMonth: boolean
  today: boolean
  selected: boolean
  weather?: WeatherData | null
  shift?: LocalShift | null
  onClick?: () => void
}) {
  const [hov, setHov] = useState(false)

  if (day === null) return <div style={{ minHeight: '52px', borderRadius: '12px' }} />

  let bg = 'transparent'
  let color = isCurrentMonth ? text : 'rgba(57,61,59,0.25)'
  let border = '1px solid transparent'
  let fontWeight: React.CSSProperties['fontWeight'] = 400
  let shadow = 'none'

  const evType = shift ? getEventType(shift) : null

  if (today) {
    bg = accent; color = primary; border = `1px solid ${accent}`; fontWeight = 700
    shadow = '0 3px 10px rgba(47,43,64,0.25)'
  } else if (selected) {
    bg = 'rgba(47,43,64,0.14)'; border = `1px solid rgba(47,43,64,0.35)`
    color = accent; fontWeight = 600; shadow = '0 2px 8px rgba(47,43,64,0.08)'
  } else if (shift?.event_type === 'personal' && !today && !selected) {
    bg = 'rgba(122,154,90,0.08)'; border = '1px solid rgba(122,154,90,0.18)'
  } else if (hov && isCurrentMonth) {
    bg = 'rgba(47,43,64,0.07)'; border = '1px solid rgba(47,43,64,0.18)'; color = accent
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label={`Day ${day}${evType ? ' – ' + evType.label : ''}`}
      aria-pressed={selected}
      title={shift?.label || evType?.label}
      style={{
        minHeight: '52px', borderRadius: '12px', border, background: bg, color,
        fontFamily: font, fontSize: '0.82rem', fontWeight,
        cursor: isCurrentMonth ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between', padding: '4px 2px 3px',
        transition: 'all 0.15s ease', boxShadow: shadow, width: '100%',
        position: 'relative', boxSizing: 'border-box',
      }}
    >
      <span style={{ lineHeight: 1 }}>{day}</span>
      {isCurrentMonth && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', minHeight: '16px' }}>
          {weather ? (
            <span title={`${weather.condition}: ${Math.round(weather.temp)}°`} style={{ fontSize: '0.68rem', lineHeight: 1, opacity: today ? 0.95 : 0.85, display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
              <span>{weather.emoji}</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 600 }}>{Math.round(weather.temp)}°</span>
            </span>
          ) : evType ? (
            <span title={evType.label} style={{ fontSize: '0.68rem', lineHeight: 1 }}>{evType.icon}</span>
          ) : null}
        </div>
      )}
      {isCurrentMonth && (
        <div style={{ display: 'flex', gap: '2px', height: '4px', alignItems: 'center' }}>
          {evType && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: today ? '#FEFAFF' : evType.color }} />}
        </div>
      )}
    </button>
  )
}

// ─── Day Edit / Create Modal ──────────────────────────────────────────────────

function DayEditModal({ dateKey, dateLabel, existing, onSave, onDelete, onClose }: {
  dateKey: string
  dateLabel: string
  existing: LocalShift | null
  onSave: (shift: LocalShift) => void
  onDelete: () => void
  onClose: () => void
}) {
  const isNew = !existing
  const defaultType: 'work' | 'day_off' | 'personal' = existing
    ? (existing.event_type ?? (existing.is_day_off ? 'day_off' : 'work'))
    : 'work'

  const [eventType, setEventType] = useState<'work' | 'day_off' | 'personal'>(defaultType)
  const [label, setLabel]         = useState(existing?.label ?? '')
  const [notes, setNotes]         = useState(existing?.notes ?? '')
  const [startTime, setStartTime] = useState(existing?.start_time?.slice(0, 5) ?? '')
  const [endTime, setEndTime]     = useState(existing?.end_time?.slice(0, 5) ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [shake, setShake]         = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    if (eventType === 'work' && !startTime) {
      setShake(true); setTimeout(() => setShake(false), 400); return
    }
    const isDayOff = eventType === 'day_off'
    const isPersonal = eventType === 'personal'
    const toFullTime = (t: string) => t ? `${t}:00` : null
    const saved: LocalShift = {
      ...(existing ?? {}),
      shift_date: dateKey,
      is_day_off: isDayOff,
      event_type: eventType,
      label: label.trim() || undefined,
      notes: notes.trim() || undefined,
      start_time: isDayOff || isPersonal ? null : toFullTime(startTime),
      end_time: isDayOff || isPersonal ? null : toFullTime(endTime),
      raw_text: label.trim() || (isDayOff ? 'OFF' : isPersonal ? 'Personal' : `${startTime}-${endTime}`),
    }
    onSave(saved)
  }

  const evConfig = EVENT_TYPES.find(e => e.value === eventType)!

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,15,35,0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'fadeInOverlay 0.2s ease both',
      }}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpModal { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes shakeInput { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        .cal-shake { animation: shakeInput 0.35s ease !important; }
        .cal-modal-input:focus { border-color: rgba(124,111,160,0.5) !important; box-shadow: 0 0 0 3px rgba(124,111,160,0.12) !important; outline: none !important; }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${isNew ? 'Add event' : 'Edit event'} for ${dateLabel}`}
        style={{
          width: '100%', maxWidth: '440px', borderRadius: '22px',
          background: 'rgba(254,250,255,0.97)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(47,43,64,0.14)',
          boxShadow: '0 24px 80px rgba(20,15,35,0.25), 0 4px 20px rgba(47,43,64,0.12)',
          animation: 'slideUpModal 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(47,43,64,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: accent, opacity: 0.45 }}>
              {isNew ? 'New Event' : 'Edit Event'}
            </p>
            <h2 style={{ margin: 0, fontFamily: font, fontSize: '1.05rem', fontWeight: 700, color: accent }}>{dateLabel}</h2>
          </div>
          <button
            onClick={onClose} aria-label="Close"
            style={{ background: 'rgba(47,43,64,0.07)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: accent, fontSize: '15px', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(47,43,64,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(47,43,64,0.07)'}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Event type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: accent, opacity: 0.55, fontFamily: font }}>Event type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {EVENT_TYPES.map(et => (
                <button
                  key={et.value}
                  onClick={() => setEventType(et.value)}
                  style={{
                    flex: 1, padding: '8px 6px', borderRadius: '10px',
                    border: `1.5px solid ${eventType === et.value ? et.color : 'rgba(47,43,64,0.12)'}`,
                    background: eventType === et.value ? `${et.color}18` : 'rgba(254,250,255,0.6)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    transition: 'all 0.15s ease', fontFamily: font,
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{et.icon}</span>
                  <span style={{ fontSize: '0.62rem', color: eventType === et.value ? et.color : accent, opacity: eventType === et.value ? 1 : 0.55, fontWeight: eventType === et.value ? 700 : 400 }}>
                    {et.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="cal-event-label" style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: accent, opacity: 0.55, fontFamily: font }}>
              Name / label <span style={{ opacity: 0.45 }}>(optional)</span>
            </label>
            <input
              id="cal-event-label"
              className="cal-modal-input"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={`e.g. ${evConfig.icon} ${evConfig.label}...`}
              maxLength={80}
              style={{ width: '100%', padding: '10px 13px', borderRadius: '10px', border: '1.5px solid rgba(47,43,64,0.14)', background: 'rgba(254,250,255,0.8)', fontFamily: font, fontSize: '0.88rem', color: accent, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }}
            />
          </div>

          {/* Time fields — work only */}
          {eventType === 'work' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="cal-start-time" style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: accent, opacity: 0.55, fontFamily: font }}>
                  Start time <span style={{ color: '#b05a7a', opacity: 0.8 }}>*</span>
                </label>
                <input
                  id="cal-start-time"
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className={shake ? 'cal-shake' : undefined}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: '10px', border: `1.5px solid ${shake ? '#b05a7a' : 'rgba(47,43,64,0.14)'}`, background: 'rgba(254,250,255,0.8)', fontFamily: font, fontSize: '0.88rem', color: accent, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="cal-end-time" style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: accent, opacity: 0.55, fontFamily: font }}>End time</label>
                <input
                  id="cal-end-time"
                  className="cal-modal-input"
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: '10px', border: '1.5px solid rgba(47,43,64,0.14)', background: 'rgba(254,250,255,0.8)', fontFamily: font, fontSize: '0.88rem', color: accent, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="cal-notes" style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: accent, opacity: 0.55, fontFamily: font }}>
              Notes <span style={{ opacity: 0.45 }}>(optional)</span>
            </label>
            <textarea
              id="cal-notes"
              className="cal-modal-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any extra details here..."
              rows={2}
              maxLength={300}
              style={{ width: '100%', padding: '10px 13px', borderRadius: '10px', border: '1.5px solid rgba(47,43,64,0.14)', background: 'rgba(254,250,255,0.8)', fontFamily: font, fontSize: '0.84rem', color: accent, outline: 'none', resize: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px 18px', borderTop: '1px solid rgba(47,43,64,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          {/* Delete */}
          {!isNew ? (
            confirmDelete ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#b05a7a', fontFamily: font }}>Sure?</span>
                <button onClick={onDelete} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#b05a7a', color: '#fff', fontFamily: font, fontSize: '0.78rem', cursor: 'pointer' }}>Yes, delete</button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(47,43,64,0.12)', background: 'transparent', color: accent, fontFamily: font, fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <button
                id="cal-delete-entry-btn"
                onClick={() => setConfirmDelete(true)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(176,90,122,0.25)', background: 'rgba(176,90,122,0.06)', color: '#b05a7a', fontFamily: font, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(176,90,122,0.12)'; e.currentTarget.style.borderColor = 'rgba(176,90,122,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(176,90,122,0.06)'; e.currentTarget.style.borderColor = 'rgba(176,90,122,0.25)' }}
              >
                🗑 Delete entry
              </button>
            )
          ) : <div />}

          {/* Save */}
          <button
            id="cal-save-entry-btn"
            onClick={handleSave}
            style={{
              padding: '10px 22px', borderRadius: '12px', border: 'none',
              background: `linear-gradient(135deg, #2f2b40 0%, #5a4a6a 60%, ${evConfig.color} 100%)`,
              color: '#FEFAFF', fontFamily: font, fontSize: '0.88rem', fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 4px 18px rgba(47,43,64,0.20)',
              transition: `all 0.2s ${ease}`, letterSpacing: '0.03em', marginLeft: 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 26px rgba(47,43,64,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(47,43,64,0.20)' }}
          >
            {evConfig.icon} {isNew ? 'Add to calendar' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Week Reset Confirm Strip ─────────────────────────────────────────────────

function WeekResetBar({ weekLabel, onConfirm, onCancel }: { weekLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ padding: '10px 16px', borderRadius: '12px', background: 'rgba(176,90,122,0.08)', border: '1px solid rgba(176,90,122,0.22)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
      <span style={{ fontFamily: font, fontSize: '0.78rem', color: '#b05a7a', flex: 1 }}>
        ⚠️ Reset all entries for the week of <strong>{weekLabel}</strong>? This cannot be undone.
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button id="cal-week-reset-confirm" onClick={onConfirm} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#b05a7a', color: '#fff', fontFamily: font, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Reset week</button>
        <button onClick={onCancel} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(47,43,64,0.15)', background: 'transparent', color: accent, fontFamily: font, fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Main Calendar Component ─────────────────────────────────────────────────

export default function Calendar() {
  const { currentUser } = useAuth()
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selected, setSelected]   = useState<{ y: number; m: number; d: number }>({
    y: now.getFullYear(), m: now.getMonth(), d: now.getDate(),
  })

  const [city, setCity]                   = useState('Toronto')
  const [isEditingCity, setIsEditingCity] = useState(false)
  const [tempCity, setTempCity]           = useState('Toronto')
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null)
  const [forecast, setForecast]           = useState<WeatherData[]>([])
  const [daysOffWeather, setDaysOffWeather] = useState<DayOffWeather[]>([])
  const [shifts, setShifts]               = useState<LocalShift[]>([])
  const [weatherNotice, setWeatherNotice] = useState<string | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)

  const [editDateKey, setEditDateKey]     = useState<string | null>(null)
  const [resetWeekConfirm, setResetWeekConfirm] = useState(false)

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

      if (shiftsData) {
        const localStr = localStorage.getItem('pookie_saved_shifts')
        let localShifts: LocalShift[] = []
        try { localShifts = JSON.parse(localStr ?? '[]') } catch { /* ignore */ }
        const localMap = new Map(localShifts.map((s: LocalShift) => [s.shift_date, s]))

        const merged: LocalShift[] = shiftsData.map(s => {
          const local = localMap.get(s.shift_date)
          return local ? { ...s, ...local } : s
        })
        localShifts.forEach((ls: LocalShift) => {
          if (!merged.find(m => m.shift_date === ls.shift_date)) merged.push(ls)
        })

        setShifts(merged)
        localStorage.setItem('pookie_saved_shifts', JSON.stringify(merged))
      }

      if (curRes.error) setWeatherNotice(curRes.error)
      else setWeatherNotice(null)
    } catch (err: any) {
      console.warn('Weather data loading error:', err)
      setWeatherNotice('Could not load live weather.')
    } finally {
      setLoadingWeather(false)
    }
  }

  useEffect(() => { loadData(city) }, [city])

  useEffect(() => {
    const handler = () => loadData(city)
    window.addEventListener('shifts-updated', handler)
    return () => window.removeEventListener('shifts-updated', handler)
  }, [city])

  const forecastMap = useMemo(() => {
    const map = new Map<string, WeatherData>()
    forecast.forEach(item => { if (item.date) map.set(item.date, item) })
    return map
  }, [forecast])

  const shiftsMap = useMemo(() => {
    const map = new Map<string, LocalShift>()
    shifts.forEach(s => { if (s.shift_date) map.set(s.shift_date, s) })
    return map
  }, [shifts])

  const persistShifts = (updated: LocalShift[]) => {
    setShifts(updated)
    localStorage.setItem('pookie_saved_shifts', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('shifts-updated'))
  }

  const handleSaveEntry = (saved: LocalShift) => {
    const updated = shifts.filter(s => s.shift_date !== saved.shift_date)
    updated.push(saved)
    persistShifts(updated)
    setEditDateKey(null)
  }

  const handleDeleteEntry = (dateKey: string) => {
    persistShifts(shifts.filter(s => s.shift_date !== dateKey))
    setEditDateKey(null)
  }

  const handleWeekReset = () => {
    const weekKeys = getWeekBounds(selected.y, selected.m, selected.d)
    persistShifts(shifts.filter(s => !weekKeys.includes(s.shift_date)))
    setResetWeekConfirm(false)
  }

  const selectedKey     = toDateKey(selected.y, selected.m, selected.d)
  const selectedShift   = shiftsMap.get(selectedKey)
  const selectedWeather = forecastMap.get(selectedKey) || (isSameDay(now, selected.y, selected.m, selected.d) ? currentWeather : null)
  const selectedEvType  = selectedShift ? getEventType(selectedShift) : null

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstDay      = getFirstDayOfMonth(viewYear, viewMonth)
  const daysInMonth   = getDaysInMonth(viewYear, viewMonth)
  const prevMonthDays = getDaysInMonth(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1)

  const cells: { day: number; isCurrentMonth: boolean; key: string }[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ day: d, isCurrentMonth: false, key: toDateKey(y, m, d) })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, key: toDateKey(viewYear, viewMonth, d) })
  }
  let trailing = 1
  while (cells.length < 42) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1
    const y = viewMonth === 11 ? viewYear + 1 : viewYear
    cells.push({ day: trailing++, isCurrentMonth: false, key: toDateKey(y, m, trailing - 1) })
  }

  const years        = buildYearList(now.getFullYear())
  const monthOptions = MONTHS.map((m, i) => ({ value: i, label: m }))
  const yearOptions  = years.map(y => ({ value: y, label: String(y) }))

  const handleCitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tempCity.trim()) { setCity(tempCity.trim()); setIsEditingCity(false) }
  }

  const selectedDateLabel = `${MONTHS[selected.m]} ${selected.d}, ${selected.y}`
  const weekBounds        = getWeekBounds(selected.y, selected.m, selected.d)
  const weekStartDate     = weekBounds[0]
  const weekEndDate       = weekBounds[6]
  const weekShiftCount    = weekBounds.filter(k => shiftsMap.has(k)).length

  return (
    <section id="calendar" style={{ width: '100%', maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Calendar Sync Status Header */}
      {currentUser?.syncedWith && (
        <div
          id="calendar-sync-header"
          style={{
            borderRadius: '16px',
            background: 'rgba(122, 154, 90, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(122, 154, 90, 0.35)',
            boxShadow: '0 2px 20px rgba(47, 43, 64, 0.06)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontFamily: font,
            color: '#36531d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>🛡️</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>
                {currentUser.firstName} is synced with @{currentUser.syncedWith} under Standard Privacy
              </p>
              <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.75 }}>
                Mutual schedule visibility active • Protected by Standard Privacy Policy
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.74rem',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(122, 154, 90, 0.22)',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            SYNCED
          </span>
        </div>
      )}

      {/* Weather Ribbon */}
      <div style={{ borderRadius: '16px', background: 'rgba(254,250,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(47,43,64,0.10)', boxShadow: '0 2px 20px rgba(47,43,64,0.06)', padding: '14px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>{currentWeather ? currentWeather.emoji : '🌤️'}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isEditingCity ? (
                <form onSubmit={handleCitySubmit} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input type="text" value={tempCity} onChange={e => setTempCity(e.target.value)} placeholder="Enter city..." style={{ fontFamily: font, fontSize: '0.9rem', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(47,43,64,0.3)', outline: 'none', background: 'rgba(255,255,255,0.8)' }} autoFocus />
                  <button type="submit" style={{ border: 'none', background: accent, color: primary, borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: font }}>Set</button>
                  <button type="button" onClick={() => setIsEditingCity(false)} style={{ border: 'none', background: 'transparent', color: accent, cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6 }}>✕</button>
                </form>
              ) : (
                <button onClick={() => { setTempCity(city); setIsEditingCity(true) }} title="Click to change city" style={{ background: 'none', border: 'none', fontFamily: font, fontSize: '1.05rem', fontWeight: 700, color: accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                  <span>{currentWeather?.city || city}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.5 }}>✏️</span>
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: text, opacity: 0.7, textTransform: 'capitalize' }}>{currentWeather ? currentWeather.description : 'Loading live weather...'}</p>
          </div>
        </div>
        {currentWeather && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: font, fontSize: '1.5rem', fontWeight: 700, color: accent, lineHeight: 1 }}>{Math.round(currentWeather.temp)}°C</span>
              <div style={{ fontSize: '0.68rem', color: text, opacity: 0.65 }}>Feels {Math.round(currentWeather.feels_like)}° • H: {Math.round(currentWeather.temp_max)}° L: {Math.round(currentWeather.temp_min)}°</div>
            </div>
            <button onClick={() => loadData(city)} disabled={loadingWeather} title="Refresh weather" style={{ background: 'rgba(47,43,64,0.06)', border: '1px solid rgba(47,43,64,0.12)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: accent, transition: 'transform 0.2s', transform: loadingWeather ? 'rotate(180deg)' : 'none' }}>🔄</button>
          </div>
        )}
      </div>

      {/* Notice Banner */}
      {weatherNotice && (
        <div style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(250, 241, 232, 0.7)', border: '1px solid rgba(176, 90, 122, 0.2)', color: accent, fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>💡</span><span style={{ flex: 1 }}>{weatherNotice}</span>
        </div>
      )}

      {/* Week Reset Confirm */}
      {resetWeekConfirm && (
        <WeekResetBar
          weekLabel={`${weekStartDate} → ${weekEndDate}`}
          onConfirm={handleWeekReset}
          onCancel={() => setResetWeekConfirm(false)}
        />
      )}

      {/* Main Calendar Card */}
      <div style={{ borderRadius: '20px', background: 'rgba(254,250,255,0.48)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(47,43,64,0.10)', boxShadow: '0 4px 40px rgba(47,43,64,0.08)', overflow: 'hidden' }}>

        {/* Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px', borderBottom: '1px solid rgba(47,43,64,0.07)', gap: '8px', flexWrap: 'wrap' }}>
          <ArrowBtn dir="left" onClick={prevMonth} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <StyledSelect ariaLabel="Select month" value={viewMonth} onChange={v => setViewMonth(Number(v))} options={monthOptions} />
            <StyledSelect ariaLabel="Select year"  value={viewYear}  onChange={v => setViewYear(Number(v))}  options={yearOptions}  />
          </div>
          {weekShiftCount > 0 && !resetWeekConfirm && (
            <button
              id="cal-reset-week-btn"
              onClick={() => setResetWeekConfirm(true)}
              title={`Reset all ${weekShiftCount} entries for week of ${weekStartDate}`}
              style={{ padding: '5px 12px', borderRadius: '9px', border: '1px solid rgba(176,90,122,0.22)', background: 'rgba(176,90,122,0.06)', color: '#b05a7a', fontFamily: font, fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(176,90,122,0.13)'; e.currentTarget.style.borderColor = 'rgba(176,90,122,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(176,90,122,0.06)'; e.currentTarget.style.borderColor = 'rgba(176,90,122,0.22)' }}
            >
              🔄 Reset week
            </button>
          )}
          <ArrowBtn dir="right" onClick={nextMonth} />
        </div>

        {/* Day-of-Week Labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', padding: '12px 12px 4px' }}>
          {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: accent, opacity: 0.45, fontFamily: font, paddingBottom: '4px' }}>{d}</div>)}
        </div>

        {/* Day Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', padding: '2px 12px 14px' }}>
          {cells.map((cell, idx) => {
            const isTodayDate = cell.isCurrentMonth && isSameDay(now, viewYear, viewMonth, cell.day)
            const isSel = selected.y === viewYear && selected.m === viewMonth && selected.d === cell.day && cell.isCurrentMonth
            const dayWeather = cell.isCurrentMonth ? forecastMap.get(cell.key) || (isTodayDate ? currentWeather : null) : null
            const dayShift = cell.isCurrentMonth ? shiftsMap.get(cell.key) : null
            return (
              <DayCell key={idx} day={cell.day} isCurrentMonth={cell.isCurrentMonth} today={isTodayDate} selected={isSel} weather={dayWeather} shift={dayShift}
                onClick={cell.isCurrentMonth ? () => setSelected({ y: viewYear, m: viewMonth, d: cell.day }) : undefined}
              />
            )
          })}
        </div>

        {/* Selected Day Details Card */}
        <div style={{ borderTop: '1px solid rgba(47,43,64,0.08)', background: 'rgba(254,250,255,0.7)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: font, fontSize: '0.95rem', fontWeight: 700, color: accent }}>{selectedDateLabel}</span>
              {isSameDay(now, selected.y, selected.m, selected.d) && (
                <span style={{ fontSize: '0.68rem', background: 'rgba(47,43,64,0.08)', padding: '2px 8px', borderRadius: '999px', color: accent }}>Today</span>
              )}
              {selectedEvType && (
                <span style={{ fontSize: '0.72rem', fontWeight: 600, background: `${selectedEvType.color}18`, border: `1px solid ${selectedEvType.color}35`, color: selectedEvType.color, padding: '2px 10px', borderRadius: '999px' }}>
                  {selectedEvType.icon} {selectedShift?.label || selectedEvType.label}
                  {selectedShift?.start_time && ` · ${selectedShift.start_time.slice(0,5)}${selectedShift.end_time ? '–' + selectedShift.end_time.slice(0,5) : ''}`}
                </span>
              )}
            </div>
            <button
              id="cal-edit-day-btn"
              onClick={() => setEditDateKey(selectedKey)}
              style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid rgba(47,43,64,0.14)', background: 'rgba(254,250,255,0.7)', color: accent, fontFamily: font, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(47,43,64,0.08)'; e.currentTarget.style.borderColor = 'rgba(47,43,64,0.28)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(254,250,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(47,43,64,0.14)' }}
            >
              {selectedShift ? '✏️ Edit entry' : '＋ Add event'}
            </button>
          </div>

          {selectedShift?.notes && (
            <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(47,43,64,0.04)', border: '1px solid rgba(47,43,64,0.07)', fontSize: '0.78rem', color: text, opacity: 0.75, fontStyle: 'italic' }}>
              📝 {selectedShift.notes}
            </div>
          )}

          {!selectedShift && (
            <div style={{ fontSize: '0.74rem', color: text, opacity: 0.45, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📅</span><span>No events on this day — click <strong>＋ Add event</strong> to create one</span>
            </div>
          )}

          {selectedWeather ? (
            <div style={{ borderRadius: '12px', background: 'rgba(254,250,255,0.85)', border: '1px solid rgba(47,43,64,0.1)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>{selectedWeather.emoji}</span>
                <div>
                  <div style={{ fontFamily: font, fontSize: '1.25rem', fontWeight: 700, color: accent, lineHeight: 1 }}>
                    {Math.round(selectedWeather.temp)}°C
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, marginLeft: '6px', opacity: 0.75 }}>{selectedWeather.condition}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: text, opacity: 0.65, marginTop: '2px' }}>{selectedWeather.description} • Feels like {Math.round(selectedWeather.feels_like)}°C</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ fontSize: '0.7rem', color: text, opacity: 0.8, background: 'rgba(47,43,64,0.05)', padding: '4px 8px', borderRadius: '6px' }}>💧 {selectedWeather.humidity}% Humidity</div>
                <div style={{ fontSize: '0.7rem', color: text, opacity: 0.8, background: 'rgba(47,43,64,0.05)', padding: '4px 8px', borderRadius: '6px' }}>💨 {selectedWeather.wind_speed} m/s</div>
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: '12px', background: 'rgba(47,43,64,0.03)', padding: '10px 14px', fontSize: '0.74rem', color: text, opacity: 0.6, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>ℹ️</span><span>Weather forecast is available within 5 days of today ({city}).</span>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Days Off Ribbon */}
      {daysOffWeather.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: '4px' }}>
            <span style={{ fontFamily: font, fontSize: '0.85rem', color: accent, opacity: 0.75, letterSpacing: '0.04em' }}>Upcoming Days Off 💕</span>
            <span style={{ fontSize: '0.72rem', color: text, opacity: 0.5 }}>Perfect dates ahead</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {daysOffWeather.slice(0, 4).map((dOff, idx) => (
              <div key={idx} style={{ borderRadius: '14px', background: 'rgba(254,250,255,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(47,43,64,0.10)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 2px 8px rgba(47,43,64,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: font, fontSize: '0.78rem', color: accent }}>{dOff.shift_date}</span><span>💕</span>
                </div>
                {dOff.weather ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '18px' }}>{dOff.weather.emoji}</span>
                    <span style={{ fontFamily: font, fontSize: '0.85rem', fontWeight: 600, color: accent }}>{Math.round(dOff.weather.temp)}°C</span>
                    <span style={{ fontSize: '0.65rem', color: text, opacity: 0.6 }}>{dOff.weather.condition}</span>
                  </div>
                ) : <div style={{ fontSize: '0.68rem', color: text, opacity: 0.5, marginTop: '4px' }}>Future date planner</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingInline: '4px', alignItems: 'center' }}>
        {EVENT_TYPES.map(et => (
          <div key={et.value} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: et.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: '0.68rem', color: text, opacity: 0.5, fontFamily: font }}>{et.icon} {et.label}</span>
          </div>
        ))}
      </div>

      {/* Day Edit Modal */}
      {editDateKey !== null && (
        <DayEditModal
          dateKey={editDateKey}
          dateLabel={(() => {
            const parts = editDateKey.split('-')
            const y = parseInt(parts[0]), m = parseInt(parts[1]) - 1, d = parseInt(parts[2])
            return `${MONTHS[m]} ${d}, ${y}`
          })()}
          existing={shiftsMap.get(editDateKey) ?? null}
          onSave={handleSaveEntry}
          onDelete={() => handleDeleteEntry(editDateKey)}
          onClose={() => setEditDateKey(null)}
        />
      )}
    </section>
  )
}
