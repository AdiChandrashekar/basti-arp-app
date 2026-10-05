// Small building blocks for the ARP app: icons, month stepper, bottom sheet, bars, calendar.
import { useEffect, useRef } from 'react'

const PATHS = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  star: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />,
  list: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  bars: <path d="M5 20V11M12 20V5M19 20v-6M3 20h18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6" /><path d="M12 16.8v.2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  cross: <path d="M6 6l12 12M18 6L6 18" />,
  school: <><path d="M3 10l9-6 9 6" /><path d="M5 9.5V20h14V9.5M10 20v-5h4v5" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9z" /></>,
  swap: <path d="M7 7h12l-3-3M17 17H5l3 3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  plan: <><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M8 2v4M16 2v4M8 11h8M8 15h5" /></>,
  gauge: <><path d="M4 18a8 8 0 1 1 16 0" /><path d="M12 18l4-6" /></>,
}

export function Icon({ name, size = 24, filled = false, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}

// ‹ August 2026 › — with allowAll, "All months" is one more step after the latest month.
export function MonthStepper({ t, months, value, onChange, allowAll = false }) {
  const list = allowAll ? [...months, 'all'] : months
  const i = list.indexOf(value)
  const prev = list[i - 1]
  const next = list[i + 1]
  return (
    <div className="stepper">
      <button className="stepper-btn" disabled={!prev} onClick={() => onChange(prev)} aria-label={t.prevMonth}>
        <Icon name="back" />
      </button>
      <div className="stepper-label" aria-live="polite">{value === 'all' ? t.allMonths : t.month(value)}</div>
      <button className="stepper-btn" disabled={!next} onClick={() => onChange(next)} aria-label={t.nextMonth}>
        <Icon name="next" />
      </button>
    </div>
  )
}

// A row of big toggle chips; exactly one is on.
export function Chips({ label, options, value, onChange }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {label && <span className="chips-label">{label}</span>}
      <div className="chips-row">
        {options.map((o) => (
          <button key={o.value} role="radio" aria-checked={value === o.value} className={`chip${value === o.value ? ' on' : ''}`} onClick={() => onChange(o.value)}>
            {o.icon && <Icon name={o.icon} size={16} filled={o.icon === 'star'} />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// A tappable number tile for the overview grids.
export function Tile({ label, value, sub, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`tile${tone ? ` tile-${tone}` : ''}${onClick ? ' tile-btn' : ''}`} onClick={onClick}>
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {sub && <span className="tile-sub">{sub}</span>}
    </Tag>
  )
}

// One practice as a % card. tone colours the number, the word says the same thing.
export function KpiCard({ t, label, pct, yes, n, delta, onClick }) {
  const tone = pct == null ? 'none' : pct >= 80 ? 'good' : pct >= 50 ? 'warn' : 'bad'
  return (
    <button className={`kpi kpi-${tone}`} onClick={onClick}>
      <span className="kpi-top">
        <span className="kpi-pct">{pct == null ? '—' : `${Math.round(pct)}%`}</span>
        <span className="kpi-word">{t.toneWord[tone]}</span>
      </span>
      <span className="kpi-bar" aria-hidden><span style={{ width: `${pct ?? 0}%` }} /></span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-count">{t.seenIn(yes, n)}</span>
      {delta != null && Math.round(delta) !== 0 && <span className={`kpi-delta ${delta > 0 ? 'up' : 'down'}`}>{t.vsLast(Math.round(delta))}</span>}
    </button>
  )
}

// Vertical bars, one per month, with a target line. Tapping a bar selects it.
export function MonthBars({ items, target, selected, onSelect }) {
  const max = Math.max(target, ...items.map((d) => d.value || 0)) * 1.1
  return (
    <div className="mbars">
      <div className="mbars-plot">
        <div className="mbars-target" style={{ bottom: `${(target / max) * 100}%` }} aria-hidden>
          <span>{target}</span>
        </div>
        {items.map((d) => (
          <button
            key={d.key}
            className={`mbar${d.key === selected ? ' on' : ''}${d.value >= target ? ' met' : ''}`}
            disabled={d.value == null}
            onClick={() => onSelect(d.key)}
            aria-label={`${d.label}: ${d.value ?? '—'}`}
          >
            <span className="mbar-val">{d.value ?? '–'}</span>
            <span className="mbar-fill" style={{ height: `${((d.value || 0) / max) * 100}%` }} />
          </button>
        ))}
      </div>
      <div className="mbars-labels" aria-hidden>
        {items.map((d) => (
          <span key={d.key} className={d.key === selected ? 'on' : ''}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

export function HelpButton({ t, onClick }) {
  return (
    <button className="help-btn" onClick={onClick} aria-label={t.help}>
      <Icon name="help" size={22} />
    </button>
  )
}

// Slides up from the bottom; closes on the backdrop, the button or Escape.
export function Sheet({ title, onClose, closeLabel, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} tabIndex={-1} ref={ref}>
        <div className="sheet-grab" aria-hidden />
        {title && <h2 className="sheet-title">{title}</h2>}
        <div className="sheet-body">{children}</div>
        <button className="btn-primary btn-block" onClick={onClose}>{closeLabel}</button>
      </div>
    </div>
  )
}

// A plain progress bar with an optional target mark.
export function Bar({ value, max, tone = 'blue', mark }) {
  const w = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="bar" aria-hidden>
      <div className={`bar-fill tone-${tone}`} style={{ width: `${w}%` }} />
      {mark != null && <div className="bar-mark" style={{ left: `${Math.min(100, (mark / max) * 100)}%` }} />}
    </div>
  )
}

// One square per focus school: filled = visited by you this month.
export function SchoolDots({ visited, total }) {
  return (
    <div className="school-dots" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < visited ? 'on' : ''}>
          {i < visited && <Icon name="check" size={16} />}
        </span>
      ))}
    </div>
  )
}

export function Calendar({ t, month, counts }) {
  const [y, m] = month.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  const first = (new Date(y, m - 1, 1).getDay() + 6) % 7 // Monday first
  const cells = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  return (
    <div className="cal">
      {t.weekHead.map((d, i) => (
        <div key={`h${i}`} className="cal-head" aria-hidden>{d}</div>
      ))}
      {cells.map((d, i) => {
        if (d == null) return <div key={`e${i}`} />
        const n = counts.get(`${month}-${String(d).padStart(2, '0')}`) || 0
        return (
          <div key={d} className={`cal-day${n ? ' on' : ''}${n > 1 ? ' many' : ''}`} aria-label={`${d}: ${n}`}>
            {d}
          </div>
        )
      })}
    </div>
  )
}

export function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}
