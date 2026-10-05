// Numbers for one ARP, computed from the decoded data (data.js).
import { groupBy, TREND_FROM } from './data.js'

// Months the ARP can step through: those with visit data, from TREND_FROM on.
export function arpMonths(data) {
  return data.months.filter((m) => m >= TREND_FROM)
}

// Every calendar month between two months, inclusive, so gaps (no data) still show.
export function monthRange(from, to) {
  const out = []
  let [y, m] = from.split('-').map(Number)
  for (let k = from; k <= to; k = `${y}-${String(m).padStart(2, '0')}`) {
    out.push(k)
    if (++m > 12) {
      m = 1
      y++
    }
  }
  return out
}

export function lastDayOf(month) {
  const [y, m] = month.split('-').map(Number)
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

// Working days (Mon-Sat) from `from` to the end of its month, inclusive.
export function workingDaysLeft(from) {
  const end = lastDayOf(from.slice(0, 7))
  let n = 0
  for (let d = new Date(from); isoDate(d) <= end; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) n++
  return n
}

// ---------- Classes and practices ----------

// FH / FM / G -> the class types an ARP filters by
export const CLASS_TYPES = ['hindi', 'maths', 'upper']
export function classType(v) {
  return { FH: 'hindi', FM: 'maths', G: 'upper' }[v.form] || 'other'
}

// Classroom practices asked in a visit (not the mentor's own feedback), with the answer.
export function visitPractices(data, v) {
  const out = []
  data.meta.kpis.forEach((k, i) => {
    if (k.group === 'school' || k.id === 'feedback') return
    const c = v.k[i]
    if (c === '1' || c === '0') out.push({ id: k.id, yes: c === '1' })
  })
  return out
}

export function schoolChecks(data, v) {
  const out = []
  data.meta.kpis.forEach((k, i) => {
    if (k.group !== 'school') return
    const c = v.k[i]
    if (c === '1' || c === '0') out.push({ id: k.id, yes: c === '1' })
  })
  return out
}

// Share of the classroom practices asked in one visit that were seen, 0-100 (null if none asked).
export function visitPct(data, v) {
  const ps = visitPractices(data, v)
  return ps.length ? (100 * ps.filter((p) => p.yes).length) / ps.length : null
}

// Share of all classroom-practice answers across visits that were "yes".
export function practicePct(data, visits) {
  let yes = 0
  let n = 0
  for (const v of visits) {
    for (const p of visitPractices(data, v)) {
      n++
      if (p.yes) yes++
    }
  }
  return n ? (100 * yes) / n : null
}

// One card per practice: [{ id, group, yes, n, pct, noVisits }], in form order. Practices never asked are left out.
export function kpiCards(data, visits) {
  return data.meta.kpis
    .map((k, i) => {
      let yes = 0
      let n = 0
      const noVisits = []
      for (const v of visits) {
        const c = v.k[i]
        if (c !== '1' && c !== '0') continue
        n++
        if (c === '1') yes++
        else noVisits.push(v)
      }
      return { id: k.id, group: k.id === 'feedback' ? 'mentor' : k.group, yes, n, pct: n ? (100 * yes) / n : null, noVisits }
    })
    .filter((c) => c.n > 0)
}

export function kpiPct(data, visits, id) {
  const i = data.kpiIndex[id]
  let yes = 0
  let n = 0
  for (const v of visits) {
    const c = v.k[i]
    if (c === '1') {
      yes++
      n++
    } else if (c === '0') n++
  }
  return n ? (100 * yes) / n : null
}

// The 3 classroom practices most often missing (asked in at least 3 classes).
export function needHelp(data, visits) {
  return kpiCards(data, visits)
    .filter((c) => (c.group === 'fln' || c.group === 'upper') && c.n >= 3 && c.yes < c.n)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)
}

export function pctTone(p) {
  if (p == null) return 'none'
  return p >= 80 ? 'good' : p >= 50 ? 'warn' : 'bad'
}

// ---------- One ARP ----------

export function mine(data, id) {
  return data.visits.filter((v) => v.mentor === id && v.month >= TREND_FROM)
}

export function monthReport(data, id, month) {
  const all = mine(data, id)
  const byMonth = groupBy(all, (v) => v.month)
  const visits = byMonth.get(month) || []
  return {
    all,
    byMonth,
    visits,
    days: new Set(visits.map((v) => v.date)).size,
    schools: new Set(visits.map((v) => v.school)).size,
    byType: groupBy(visits, classType),
    practice: practicePct(data, visits),
    needHelp: needHelp(data, visits),
    focus: focusSchools(data, id, month),
  }
}

// ---------- Schools ----------

// Everything about one school for the deep-dive page, up to `month`.
// Focus schools are shown from the programme start, other schools for 6 months.
export function schoolStory(data, id, sid, month) {
  const isFocus = !!data.adoptedBy.get(id)?.some((s) => s.id === sid)
  const from = isFocus ? data.meta.sspFrom : monthRange(TREND_FROM, month).slice(-6)[0]
  const all = data.visits
    .filter((v) => v.school === sid && v.month >= from && v.month <= month)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  const ownMonths = new Set(all.filter((v) => v.mentor === id).map((v) => v.month))
  const anyMonths = new Set(all.map((v) => v.month))
  const own = all.filter((v) => v.mentor === id)
  return {
    school: data.schools[sid],
    isFocus,
    from,
    all,
    own,
    lastOwn: own[0],
    last: all[0],
    strip: monthRange(from, month).map((m) => ({
      m,
      own: ownMonths.has(m),
      other: !ownMonths.has(m) && anyMonths.has(m),
      noData: !data.months.includes(m),
    })),
  }
}

// The ARP's focus schools for a month: who still needs a visit, who is done.
export function focusSchools(data, id, month) {
  const adopted = data.adoptedBy.get(id) || []
  const ids = new Set(adopted.map((s) => s.id))
  const from = data.meta.sspFrom
  const bySchool = groupBy(
    data.visits.filter((v) => ids.has(v.school) && v.month >= from && v.month <= month),
    (v) => v.school,
  )
  const rows = adopted.map((s) => {
    const all = [...(bySchool.get(s.id) || [])].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    const inMonth = all.filter((v) => v.month === month)
    const own = inMonth.filter((v) => v.mentor === id)
    const lastOwn = all.find((v) => v.mentor === id)
    return {
      school: s,
      all,
      ownInMonth: own.length,
      done: own.length > 0,
      others: [...new Set(inMonth.filter((v) => v.mentor !== id).map((v) => v.mentor))],
      lastOwn,
      lastPct: lastOwn ? visitPct(data, lastOwn) : null,
      ownMonths: new Set(all.filter((v) => v.mentor === id).map((v) => v.month)),
    }
  })
  const byLast = (a, b) => (a.lastOwn?.date || '').localeCompare(b.lastOwn?.date || '') || a.school.name.localeCompare(b.school.name)
  return {
    rows,
    todo: rows.filter((r) => !r.done).sort(byLast),
    done: rows.filter((r) => r.done).sort((a, b) => a.school.name.localeCompare(b.school.name)),
    total: rows.length,
    visited: rows.filter((r) => r.done).length,
    inScope: month >= from,
  }
}

// ---------- Planning ----------

// Schools worth visiting next, as of the last data day: every focus school
// (longest since your visit first), then other schools you visited in the last
// 90 days where fewer than half the practices were seen on your last visit.
export function planSuggestions(data, id) {
  const asOf = data.meta.dateTo
  const latest = data.months[data.months.length - 1]
  const focus = focusSchools(data, id, latest)
  const focusIds = new Set(focus.rows.map((r) => r.school.id))
  const focusRows = [...focus.rows]
    .sort((a, b) => (a.lastOwn?.date || '').localeCompare(b.lastOwn?.date || ''))
    .map((r) => ({ sid: r.school.id, kind: 'focus', last: r.lastOwn?.date || null, days: r.lastOwn ? daysBetween(r.lastOwn.date, asOf) : null }))

  const recent = mine(data, id).filter((v) => !focusIds.has(v.school) && daysBetween(v.date, asOf) <= 90)
  const followUp = [...groupBy(recent, (v) => v.school)]
    .map(([sid, vs]) => {
      const last = vs.reduce((a, v) => (v.date > a.date ? v : a))
      const gaps = visitPractices(data, last).filter((p) => !p.yes).length
      return { sid, kind: 'followUp', last: last.date, days: daysBetween(last.date, asOf), gaps, pct: visitPct(data, last) }
    })
    .filter((r) => r.pct != null && r.pct < 50 && r.gaps >= 3)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 8)
  return { focus: focusRows, followUp }
}
