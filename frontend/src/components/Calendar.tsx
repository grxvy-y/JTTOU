import { useState, useRef, useEffect } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const YEAR_RANGE_BEHIND = 5
const YEAR_RANGE_AHEAD  = 10

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

function isToday(year: number, month: number, day: number) {
  const t = new Date()
  return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day
}

// ─── Inline style tokens ──────────────────────────────────────────────────────

const accent  = 'var(--color-accent)'
const bg      = 'var(--color-bg)'
const primary = 'var(--color-primary)'
const text    = 'var(--color-text)'
const font    = "'ADLaM Display', cursive"

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Small arrow button used for prev/next navigation */
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
        width: '30px', height: '30px',
        borderRadius: '8px',
        border: `1px solid ${hov ? 'rgba(47,43,64,0.25)' : 'rgba(47,43,64,0.12)'}`,
        background: hov ? 'rgba(47,43,64,0.08)' : 'rgba(254,250,255,0.45)',
        color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'background 0.15s, border-color 0.15s',
        flexShrink: 0,
        fontSize: '15px',
      }}
    >
      {dir === 'left' ? '‹' : '›'}
    </button>
  )
}

/** Styled select / dropdown */
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
          background: 'rgba(254,250,255,0.55)',
          border: '1px solid rgba(47,43,64,0.18)',
          borderRadius: '10px',
          color: accent,
          fontFamily: font,
          fontSize: '1rem',
          fontWeight: 400,
          padding: '6px 32px 6px 12px',
          cursor: 'pointer',
          outline: 'none',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(47,43,64,0.40)')}
        onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(47,43,64,0.18)')}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {/* chevron */}
      <span style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: accent, fontSize: '11px', opacity: 0.6,
      }}>▾</span>
    </div>
  )
}

/** Individual day cell */
function DayCell({
  day, isCurrentMonth, today, selected, onClick,
}: {
  day: number | null
  isCurrentMonth: boolean
  today: boolean
  selected: boolean
  onClick?: () => void
}) {
  const [hov, setHov] = useState(false)

  if (day === null) {
    return <div style={{ aspectRatio: '1', borderRadius: '10px' }} />
  }

  let bg2 = 'transparent'
  let color2 = isCurrentMonth ? text : 'rgba(57,61,59,0.3)'
  let border = '1px solid transparent'
  let fontWeight: React.CSSProperties['fontWeight'] = 400
  let shadow = 'none'

  if (today) {
    bg2    = accent
    color2 = primary
    border = `1px solid ${accent}`
    fontWeight = 700
    shadow = '0 2px 8px rgba(47,43,64,0.22)'
  } else if (selected) {
    bg2    = 'rgba(47,43,64,0.13)'
    border = `1px solid rgba(47,43,64,0.28)`
    color2 = accent
    fontWeight = 600
  } else if (hov && isCurrentMonth) {
    bg2    = 'rgba(47,43,64,0.07)'
    border = '1px solid rgba(47,43,64,0.18)'
    color2 = accent
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label={`Day ${day}`}
      aria-pressed={selected}
      style={{
        aspectRatio: '1',
        borderRadius: '10px',
        border,
        background: bg2,
        color: color2,
        fontFamily: font,
        fontSize: '0.8rem',
        fontWeight,
        cursor: isCurrentMonth ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s',
        boxShadow: shadow,
        width: '100%',
      }}
    >
      {day}
    </button>
  )
}

// ─── Main Calendar component ─────────────────────────────────────────────────

export default function Calendar() {
  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())   // 0-indexed
  const [selected,  setSelected]  = useState<{ y: number; m: number; d: number } | null>(null)

  const years = buildYearList(now.getFullYear())

  // ── Navigation helpers ──
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else                 { setViewMonth(m  => m - 1) }
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0);  setViewYear(y => y + 1) }
    else                  { setViewMonth(m  => m + 1) }
  }

  // ── Build grid cells ──
  const firstDay   = getFirstDayOfMonth(viewYear, viewMonth)
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)

  // Previous month's trailing days
  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1,
  )

  const cells: { day: number; isCurrentMonth: boolean }[] = []

  // Leading cells from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, isCurrentMonth: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true })
  }
  // Trailing cells to fill 6-row grid (42 cells total)
  let trailing = 1
  while (cells.length < 42) {
    cells.push({ day: trailing++, isCurrentMonth: false })
  }

  const monthOptions = MONTHS.map((m, i) => ({ value: i, label: m }))
  const yearOptions  = years.map(y => ({ value: y, label: String(y) }))

  return (
    <section
      id="calendar"
      style={{
        width: '100%',
        maxWidth: '520px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      {/* ── Card ── */}
      <div style={{
        borderRadius: '18px',
        background: 'rgba(254,250,255,0.45)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(47,43,64,0.10)',
        boxShadow: '0 4px 40px rgba(47,43,64,0.08)',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px 10px',
          borderBottom: '1px solid rgba(47,43,64,0.07)',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <ArrowBtn dir="left" onClick={prevMonth} />

          {/* Month + Year selects */}
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

        {/* ── Day-of-week labels ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '3px',
          padding: '10px 10px 2px',
        }}>
          {DAYS.map(d => (
            <div key={d} style={{
              textAlign: 'center',
              fontSize: '0.7rem',
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

        {/* ── Day grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '3px',
          padding: '2px 10px 12px',
        }}>
          {cells.map((cell, idx) => {
            const today = cell.isCurrentMonth && isToday(viewYear, viewMonth, cell.day)
            const sel   = selected !== null
              && selected.y === viewYear
              && selected.m === viewMonth
              && selected.d === cell.day
              && cell.isCurrentMonth

            return (
              <DayCell
                key={idx}
                day={cell.day}
                isCurrentMonth={cell.isCurrentMonth}
                today={today}
                selected={sel}
                onClick={cell.isCurrentMonth ? () => setSelected({ y: viewYear, m: viewMonth, d: cell.day }) : undefined}
              />
            )
          })}
        </div>

        {/* ── Selected date footer ── */}
        {selected && (
          <div style={{
            borderTop: '1px solid rgba(47,43,64,0.07)',
            padding: '12px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px',
          }}>
            <span style={{ fontFamily: font, fontSize: '0.85rem', color: accent, opacity: 0.75 }}>
              {MONTHS[selected.m]} {selected.d}, {selected.y}
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', color: accent, opacity: 0.4,
                fontFamily: font, padding: '2px 6px', borderRadius: '6px',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
