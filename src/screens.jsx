// The app's screens. Each gets { data, t, id, month, months, latest, today, rep, nav, plan }.
import { useState } from 'react'
import { groupBy } from './data.js'
import {
  CLASS_TYPES,
  classType,
  daysBetween,
  isoDate,
  kpiCards,
  kpiPct,
  lastDayOf,
  mine,
  monthRange,
  needHelp,
  planSuggestions,
  practicePct,
  schoolChecks,
  schoolStory,
  visitPct,
  visitPractices,
  workingDaysLeft,
} from './model.js'
import { Bar, Calendar, Chips, HelpButton, Icon, KpiCard, MonthBars, MonthStepper, SchoolDots, Sheet, Tile } from './ui.jsx'

const pctText = (p) => (p == null ? '—' : `${Math.round(p)}%`)
const tone = (p) => (p == null ? undefined : p >= 80 ? 'good' : p >= 50 ? 'warn' : 'bad')

function Card({ title, sub, help, t, nav, tone: cardTone, children }) {
  return (
    <section className={`card${cardTone ? ` card-${cardTone}` : ''}`}>
      {title && (
        <div className="card-head">
          <h2>{title}</h2>
          {help && <HelpButton t={t} onClick={() => nav.help(help)} />}
        </div>
      )}
      {sub && <p className="card-sub">{sub}</p>}
      {children}
    </section>
  )
}

function Status({ tone: st, children }) {
  return (
    <p className={`status status-${st}`}>
      <Icon name={st === 'good' ? 'check' : 'next'} size={20} />
      <span>{children}</span>
    </p>
  )
}

function SectionHead({ children, action }) {
  return (
    <div className="section-head">
      <h2 className="list-head">{children}</h2>
      {action}
    </div>
  )
}

// ======================================================================
// Home: the month at a glance
// ======================================================================

export function HomeScreen({ data, t, id, month, months, latest, today, rep, nav, mentor }) {
  const target = data.meta.arpMonthlyTarget
  const n = rep.visits.length
  const isCurrent = month === today.slice(0, 7)
  const inProgress = month === latest && data.meta.dateTo < lastDayOf(month)
  const daysLeft = isCurrent ? workingDaysLeft(today) : 0
  const { focus } = rep
  const lagging = latest < today.slice(0, 7)
  const sixMonths = monthRange(months[0], latest).slice(-6)
  const recent = [...rep.visits].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)

  return (
    <>
      <div className="hello">
        <h1>{t.namaste(mentor.name)}</h1>
        <p>{t.dataTill(t.date(data.meta.dateTo))}</p>
      </div>
      {lagging && month === latest && <p className="note">{t.dataLag(t.month(monthRange(latest, today.slice(0, 7))[1]), t.month(latest))}</p>}
      <MonthStepper t={t} months={months} value={month} onChange={nav.setMonth} />

      <Card title={t.visitsCard} help="visits" t={t} nav={nav} tone={n >= target ? 'good' : 'warn'}>
        <div className="big-number">
          <b>{n}</b>
          <span>/ {target}</span>
        </div>
        <Bar value={n} max={target} tone={n >= target ? 'good' : 'blue'} />
        {n >= target ? (
          <Status tone="good">{t.targetDone}</Status>
        ) : (
          <Status tone="warn">{inProgress || isCurrent ? t.moreNeeded(target - n) : t.shortBy(target - n)}</Status>
        )}
        {isCurrent && n < target && daysLeft > 0 && <p className="card-sub card-sub-tight">{t.perDay(Math.ceil((target - n) / daysLeft), daysLeft)}</p>}
      </Card>

      <div className="tiles">
        <Tile label={t.tileDays} value={rep.days} onClick={() => nav.help('days')} />
        <Tile label={t.tileSchools} value={rep.schools} onClick={() => nav.help('schools')} />
        {focus.total > 0 && focus.inScope && (
          <Tile
            label={t.tileFocus}
            value={`${focus.visited}/${focus.total}`}
            tone={focus.visited === focus.total ? 'good' : 'warn'}
            onClick={() => nav.tab('focus')}
          />
        )}
        <Tile label={t.tilePractice} value={pctText(rep.practice)} sub={t.tilePracticeSub} tone={tone(rep.practice)} onClick={() => nav.tab('kpi')} />
      </div>

      {n > 0 && (
        <Card title={t.classMix} t={t} nav={nav}>
          <ul className="mix">
            {[...CLASS_TYPES, 'other'].map((c) => {
              const k = rep.byType.get(c)?.length || 0
              if (!k && c === 'other') return null
              return (
                <li key={c}>
                  <button onClick={() => nav.openKpi({ c: c === 'other' ? '' : c })} disabled={!k || c === 'other'}>
                    <span className="mix-label">{t.typeLabel[c]}</span>
                    <b>{k}</b>
                    <Bar value={k} max={n} tone="blue" />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Card title={t.lastMonths} sub={t.targetLine(target)} help="visits" t={t} nav={nav}>
        <MonthBars
          target={target}
          selected={month}
          onSelect={nav.setMonth}
          items={sixMonths.map((m) => ({
            key: m,
            label: t.monthShort(m),
            value: data.months.includes(m) ? rep.byMonth.get(m)?.length || 0 : null,
          }))}
        />
      </Card>

      {rep.needHelp.length > 0 && (
        <Card title={t.helpCard} sub={t.helpCardSub} help="helpWith" t={t} nav={nav}>
          <ul className="practice-list">
            {rep.needHelp.map((r) => (
              <li key={r.id}>
                <button className="practice-btn" onClick={() => nav.kpiSheet(r.id, rep.visits)}>
                  <span className="practice-name">{t.kpi(r.id)}</span>
                  <span className="practice-count">{t.seenIn(r.yes, r.n)}</span>
                  <Bar value={r.yes} max={r.n} tone={tone(r.pct)} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={t.calendarTitle} help="days" t={t} nav={nav}>
        <Calendar t={t} month={month} counts={new Map([...groupBy(rep.visits, (v) => v.date)].map(([d, vs]) => [d, vs.length]))} />
        <p className="card-sub cal-key"><i aria-hidden /> {t.calendarKey}</p>
      </Card>

      {recent.length > 0 && (
        <>
          <SectionHead>{t.recentVisits}</SectionHead>
          <div className="rows">
            {recent.slice(0, 3).map((v) => <VisitRow key={v.id} v={v} data={data} t={t} nav={nav} id={id} />)}
          </div>
          {recent.length > 3 && (
            <button className="btn-secondary btn-block" onClick={() => nav.open('visits')}>
              {t.seeAllVisits(recent.length)} <Icon name="next" size={20} />
            </button>
          )}
        </>
      )}
      {!n && <p className="empty">{t.nothingYet}</p>}
    </>
  )
}

// ======================================================================
// Upcoming: plan the next visits
// ======================================================================

export function PlanScreen({ data, t, id, today, nav, plan }) {
  const target = data.meta.arpMonthlyTarget
  const curMonth = today.slice(0, 7)
  const latest = data.months[data.months.length - 1]
  const sug = planSuggestions(data, id)
  // A planned school counts as done once the data shows your visit after you planned it.
  const lastOwn = new Map()
  for (const v of mine(data, id)) if (!lastOwn.has(v.school) || v.date > lastOwn.get(v.school)) lastOwn.set(v.school, v.date)
  const items = plan.items
    .map((it) => ({ ...it, auto: !it.done && lastOwn.get(it.sid) >= it.added }))
    .sort((a, b) => (a.done || a.auto) - (b.done || b.auto) || (a.date || '9999').localeCompare(b.date || '9999'))
  const doneCount = items.filter((it) => it.done || it.auto).length
  const byDay = groupBy(items.filter((it) => !it.done && !it.auto), (it) => it.date || '')
  const finished = items.filter((it) => it.done || it.auto)
  const dataCurrent = latest === curMonth
  const doneThisMonth = dataCurrent ? mine(data, id).filter((v) => v.month === curMonth).length : null
  const daysLeft = workingDaysLeft(today)

  const dayLabel = (d) => (d === today ? t.today : daysBetween(today, d) === 1 ? t.tomorrow : t.dayDate(d))

  return (
    <>
      <div className="hello">
        <h1>{t.planTitle(t.month(curMonth))}</h1>
        <p>{t.planIntro}</p>
      </div>

      <Card t={t} nav={nav} tone={doneThisMonth != null && doneThisMonth >= target ? 'good' : undefined}>
        <div className="card-head">
          <h2>{t.myPlan}</h2>
          <HelpButton t={t} onClick={() => nav.help('plan')} />
        </div>
        <p className="card-text card-text-lg">{t.planCounts(items.length, doneCount)}</p>
        {doneThisMonth != null && doneThisMonth < target && daysLeft > 0 && (
          <p className="card-sub card-sub-tight">{t.moreNeeded(target - doneThisMonth)} · {t.perDay(Math.ceil((target - doneThisMonth) / daysLeft), daysLeft)}</p>
        )}
        <button className="btn-secondary btn-block" onClick={() => nav.sheet({ kind: 'search' })}>
          <Icon name="plus" size={20} /> {t.addOther}
        </button>
      </Card>

      {!items.length && <p className="empty">{t.planEmpty}</p>}

      {[...byDay].map(([d, its]) => (
        <div key={d || 'none'}>
          <SectionHead>
            {d ? dayLabel(d) : t.noDate}
            {d && d < today && <span className="tag tag-warn">{t.datePassed}</span>}
          </SectionHead>
          <div className="rows">
            {its.map((it) => <PlanRow key={it.key} it={it} data={data} t={t} nav={nav} plan={plan} id={id} />)}
          </div>
        </div>
      ))}
      {finished.length > 0 && (
        <>
          <SectionHead>{t.doneHead} · {finished.length}</SectionHead>
          <div className="rows">
            {finished.map((it) => <PlanRow key={it.key} it={it} data={data} t={t} nav={nav} plan={plan} id={id} />)}
          </div>
        </>
      )}

      {sug.focus.length > 0 && (
        <>
          <SectionHead>{t.suggestFocus}</SectionHead>
          <p className="hint hint-tight">{t.suggestFocusSub}</p>
          <div className="rows">
            {sug.focus.map((s) => (
              <SuggestRow key={s.sid} s={s} data={data} t={t} nav={nav} plan={plan} note={s.last ? t.youLast(t.date(s.last)) : t.neverVisited} focus />
            ))}
          </div>
        </>
      )}
      {sug.followUp.length > 0 && (
        <>
          <SectionHead>{t.suggestFollow}</SectionHead>
          <p className="hint hint-tight">{t.suggestFollowSub}</p>
          <div className="rows">
            {sug.followUp.map((s) => (
              <SuggestRow key={s.sid} s={s} data={data} t={t} nav={nav} plan={plan} note={`${t.youLast(t.date(s.last))} · ${t.gapsCount(s.gaps)}`} />
            ))}
          </div>
        </>
      )}
      <p className="hint">{t.planDataNote(t.date(data.meta.dateTo))}</p>
    </>
  )
}

function PlanRow({ it, data, t, nav, plan, id }) {
  const s = data.schools[it.sid]
  const finished = it.done || it.auto
  const isFocus = data.adoptedBy.get(id)?.some((x) => x.id === it.sid)
  return (
    <div className={`row plan-row${finished ? ' row-done' : ''}`}>
      <button
        className={`check-btn${finished ? ' on' : ''}`}
        onClick={() => !it.auto && plan.toggle(it.key)}
        aria-pressed={finished}
        aria-label={finished ? t.undo : t.markDone}
        disabled={it.auto}
      >
        <Icon name="check" size={22} />
      </button>
      <button className="row-text row-link" onClick={() => nav.open('school', it.sid)}>
        <b>{s.name}{isFocus && <span className="tag"><Icon name="star" size={14} filled /> {t.focusBadge}</span>}</b>
        <span>{s.block} · {t.schoolType[s.type] || s.type}</span>
      </button>
      {!it.auto && (
        <button className="icon-btn icon-btn-dark" onClick={() => plan.remove(it.key)} aria-label={t.remove}>
          <Icon name="trash" size={20} />
        </button>
      )}
    </div>
  )
}

function SuggestRow({ s, data, t, nav, plan, note, focus }) {
  const school = data.schools[s.sid]
  const inPlan = plan.has(s.sid)
  return (
    <div className="row suggest-row">
      <button className="row-text row-link" onClick={() => nav.open('school', s.sid)}>
        <b>{school.name}{focus && <span className="tag"><Icon name="star" size={14} filled /> {t.focusBadge}</span>}</b>
        <span className={s.last ? '' : 'text-bad'}>{note}</span>
      </button>
      <button className={`add-btn${inPlan ? ' on' : ''}`} onClick={() => nav.sheet({ kind: 'day', sid: s.sid })}>
        <Icon name={inPlan ? 'check' : 'plus'} size={18} />
        {inPlan ? t.inPlan : t.add}
      </button>
    </div>
  )
}

// Pick a day for a school, then add it to the plan.
export function DaySheet({ data, t, sid, today, plan, onClose }) {
  const days = []
  for (let d = new Date(today); days.length < 8; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) days.push(isoDate(d))
  const pick = (date) => {
    plan.add(sid, date)
    onClose()
  }
  return (
    <Sheet title={t.chooseDay} onClose={onClose} closeLabel={t.close}>
      <p className="sheet-meta"><b>{data.schools[sid].name}</b> · {data.schools[sid].block}</p>
      <div className="day-grid">
        {days.map((d) => (
          <button key={d} className="day-btn" onClick={() => pick(d)}>
            {d === today ? t.today : daysBetween(today, d) === 1 ? t.tomorrow : t.dayShort(d)}
          </button>
        ))}
        <button className="day-btn day-btn-wide" onClick={() => pick(null)}>{t.noDate}</button>
      </div>
    </Sheet>
  )
}

// Find any school by name (own block first), then choose a day.
export function SearchSheet({ data, t, mentor, onPick, onClose }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const hits =
    needle.length < 2
      ? []
      : data.schools
          .filter((s) => s.name.toLowerCase().includes(needle) || s.udise?.includes(needle))
          .sort((a, b) => (a.block !== mentor.block) - (b.block !== mentor.block) || a.name.localeCompare(b.name))
          .slice(0, 25)
  return (
    <Sheet title={t.addOther} onClose={onClose} closeLabel={t.close}>
      <label className="search">
        <Icon name="search" size={22} />
        <input autoFocus type="search" placeholder={t.searchSchool} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {needle.length < 2 ? (
        <p className="muted-text">{t.typeToSearch}</p>
      ) : hits.length ? (
        <div className="rows">
          {hits.map((s) => (
            <button key={s.id} className="row" onClick={() => onPick(s.id)}>
              <span className="row-text">
                <b>{s.name}</b>
                <span>{s.block} · {t.schoolType[s.type] || s.type} · {s.udise}</span>
              </span>
              <Icon name="plus" />
            </button>
          ))}
        </div>
      ) : (
        <p className="muted-text">{t.noMatch}</p>
      )}
    </Sheet>
  )
}

// ======================================================================
// Class KPIs: % cards with filters
// ======================================================================

const KPI_GROUPS = ['fln', 'upper', 'school', 'mentor']

function filterVisits(data, id, { month, cls, schools }) {
  const focusIds = new Set((data.adoptedBy.get(id) || []).map((s) => s.id))
  return mine(data, id).filter(
    (v) =>
      (month === 'all' || v.month === month) &&
      (!cls || classType(v) === cls) &&
      (schools !== 'focus' || focusIds.has(v.school)),
  )
}

export function KpiScreen({ data, t, id, months, nav, filters }) {
  const { month, cls, schools } = filters
  const visits = filterVisits(data, id, filters)
  const prevMonth = month === 'all' ? null : months[months.indexOf(month) - 1]
  const prev = prevMonth ? filterVisits(data, id, { ...filters, month: prevMonth }) : []
  const cards = kpiCards(data, visits)
  const groupTitle = { fln: t.groupFln, upper: t.groupUpper, school: t.groupSchool, mentor: t.groupMentor }
  const hasFocus = (data.adoptedBy.get(id) || []).length > 0

  return (
    <>
      <div className="hello">
        <h1>{t.kpiTitle}</h1>
        <p>{t.kpiSub}</p>
      </div>
      <MonthStepper t={t} months={months} value={month} onChange={(m) => nav.setKpi({ m })} allowAll />
      <div className="filters">
        <Chips
          label={t.filterClass}
          value={cls}
          onChange={(c) => nav.setKpi({ c })}
          options={[{ value: '', label: t.allClasses }, ...CLASS_TYPES.map((c) => ({ value: c, label: t.typeLabel[c] }))]}
        />
        {hasFocus && (
          <Chips
            label={t.filterSchools}
            value={schools}
            onChange={(f) => nav.setKpi({ f })}
            options={[
              { value: '', label: t.allSchools },
              { value: 'focus', label: t.focusOnly, icon: 'star' },
            ]}
          />
        )}
      </div>

      {!visits.length ? (
        <p className="empty">{t.noMatchFilters}</p>
      ) : (
        <>
          <div className="summary-line">
            <span>{t.basedOn(visits.length)}</span>
            <HelpButton t={t} onClick={() => nav.help('kpi')} />
          </div>
          <Card t={t} nav={nav} tone={tone(practicePct(data, visits))}>
            <div className="card-head">
              <h2>{t.tilePractice}</h2>
              <HelpButton t={t} onClick={() => nav.help('practice')} />
            </div>
            <div className="big-number">
              <b>{pctText(practicePct(data, visits))}</b>
            </div>
            <Bar value={practicePct(data, visits) || 0} max={100} tone={tone(practicePct(data, visits)) || 'blue'} />
          </Card>
          {KPI_GROUPS.map((g) => {
            const gc = cards.filter((c) => c.group === g)
            if (!gc.length) return null
            return (
              <div key={g}>
                <SectionHead>{groupTitle[g]}</SectionHead>
                <div className="kpi-grid">
                  {gc.map((c) => {
                    const p = prev.length ? kpiPct(data, prev, c.id) : null
                    return (
                      <KpiCard
                        key={c.id}
                        t={t}
                        label={t.kpi(c.id)}
                        pct={c.pct}
                        yes={c.yes}
                        n={c.n}
                        delta={p == null || c.pct == null ? null : c.pct - p}
                        onClick={() => nav.kpiSheet(c.id, visits, filters)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
          <p className="hint">{t.tapCard}</p>
        </>
      )}
    </>
  )
}

// One practice in detail: the %, its last 6 months, and the classes where it was missing.
export function KpiSheet({ data, t, id, kpi, visits, filters, months, onVisit, onClose }) {
  const card = kpiCards(data, visits).find((c) => c.id === kpi)
  const lastMonth = filters?.month && filters.month !== 'all' ? filters.month : months[months.length - 1]
  const six = months.filter((m) => m <= lastMonth).slice(-6)
  return (
    <Sheet title={t.kpi(kpi)} onClose={onClose} closeLabel={t.close}>
      {card && (
        <>
          <div className="big-number">
            <b className={`text-${tone(card.pct)}`}>{pctText(card.pct)}</b>
            <span className="tone-word">{t.toneWord[tone(card.pct) || 'none']}</span>
          </div>
          <p className="sheet-meta">{t.seenIn(card.yes, card.n)}</p>
        </>
      )}
      {filters && (
        <>
          <h3 className="sheet-label">{t.monthByMonth}</h3>
          <ul className="trend-list">
            {six.map((m) => {
              const p = kpiPct(data, filterVisits(data, id, { ...filters, month: m }), kpi)
              return (
                <li key={m}>
                  <span>{t.monthShort(m)}</span>
                  <Bar value={p ?? 0} max={100} tone={tone(p) || 'blue'} />
                  <b>{pctText(p)}</b>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <h3 className="sheet-label">{t.missingIn}</h3>
      {card?.noVisits.length ? (
        <div className="rows">
          {card.noVisits
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 20)
            .map((v) => (
              <button key={v.id} className="row row-compact" onClick={() => onVisit(v)}>
                <span className="row-text">
                  <b>{data.schools[v.school].name}</b>
                  <span>{t.date(v.date)} · {v.grade ? t.classN(v.grade) : ''} {t.subject(v.subject)}</span>
                </span>
                <Icon name="next" />
              </button>
            ))}
        </div>
      ) : (
        <p className="status status-good"><Icon name="check" size={20} /> <span>{t.noneMissing}</span></p>
      )}
    </Sheet>
  )
}

// ======================================================================
// Focus schools
// ======================================================================

export function FocusScreen({ data, t, id, month, months, rep, nav }) {
  const { focus } = rep
  const from = t.month(data.meta.sspFrom)
  if (!focus.total) return <p className="empty">{t.noFocus}</p>

  const ids = new Set(focus.rows.map((r) => r.school.id))
  const focusVisits = rep.visits.filter((v) => ids.has(v.school))
  const fp = practicePct(data, focusVisits)
  const twoMonthsAgo = monthRange(data.meta.sspFrom, month).slice(-3)[0]
  const overdue = focus.rows.filter((r) => !r.lastOwn || r.lastOwn.month < twoMonthsAgo).length
  const weak = needHelp(data, focusVisits)

  return (
    <>
      <div className="hello">
        <h1>{t.focusTitle}</h1>
      </div>
      <MonthStepper t={t} months={months} value={month} onChange={nav.setMonth} />
      {!focus.inScope ? (
        <p className="empty">{t.focusFrom(from)}</p>
      ) : (
        <>
          <Card t={t} nav={nav} tone={focus.visited === focus.total ? 'good' : 'warn'}>
            <div className="card-head">
              <h2>{t.focusVisitedTile}</h2>
              <HelpButton t={t} onClick={() => nav.help('focus')} />
            </div>
            <div className="big-number">
              <b>{focus.visited}</b>
              <span>/ {focus.total}</span>
            </div>
            <SchoolDots visited={focus.visited} total={focus.total} />
          </Card>
          <div className="tiles tiles-3">
            <Tile label={t.focusVisitsTile} value={focusVisits.length} />
            <Tile label={t.focusPracticeTile} value={pctText(fp)} tone={tone(fp)} onClick={() => nav.openKpi({ f: 'focus', m: month })} />
            <Tile label={t.focusOverdueTile} value={overdue} tone={overdue ? 'bad' : 'good'} />
          </div>

          {weak.length > 0 && (
            <>
              <SectionHead>{t.focusKpis}</SectionHead>
              <div className="kpi-grid">
                {weak.map((c) => (
                  <KpiCard key={c.id} t={t} label={t.kpi(c.id)} pct={c.pct} yes={c.yes} n={c.n} onClick={() => nav.kpiSheet(c.id, focusVisits, { month, cls: '', schools: 'focus' })} />
                ))}
              </div>
              <button className="btn-secondary btn-block" onClick={() => nav.openKpi({ f: 'focus', m: month })}>
                {t.seeAllKpis} <Icon name="next" size={20} />
              </button>
            </>
          )}

          <SectionHead>{t.schoolsList}</SectionHead>
          <div className="school-cards">
            {[...focus.todo, ...focus.done].map((r) => (
              <FocusCard key={r.school.id} r={r} data={data} t={t} nav={nav} from={from} month={month} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

function FocusCard({ r, data, t, nav, from, month }) {
  const strip = monthRange(data.meta.sspFrom, month)
  return (
    <button className={`school-card${r.done ? ' done' : ''}`} onClick={() => nav.open('school', r.school.id)}>
      <span className="school-card-top">
        <b>{r.school.name}</b>
        <span className={`pill pill-${r.done ? 'good' : 'warn'}`}>
          <Icon name={r.done ? 'check' : 'school'} size={16} />
          {r.done ? t.statusDone : t.statusTodo}
        </span>
      </span>
      <span className="school-card-line">{r.lastOwn ? t.youLast(t.date(r.lastOwn.date)) : t.youNever(from)}</span>
      {r.lastPct != null && <span className={`school-card-line text-${tone(r.lastPct)}`}>{t.lastPct(Math.round(r.lastPct))}</span>}
      {!r.done && r.others.length > 0 && <span className="school-card-note">{t.othersVisited(r.others.map((m) => data.mentors[m].name).join(', '))}</span>}
      <span className="mini-strip" aria-hidden>
        {strip.map((m) => (
          <span key={m} className={r.ownMonths.has(m) ? 'on' : data.months.includes(m) ? '' : 'nodata'}>
            <i>{t.monthShort(m)}</i>
          </span>
        ))}
      </span>
    </button>
  )
}

// ======================================================================
// One school, in depth
// ======================================================================

export function SchoolScreen({ data, t, id, month, nav, plan, sid }) {
  if (!data.schools[sid]) return <p className="empty">{t.noMatch}</p>
  const st = schoolStory(data, id, sid, month)
  const s = st.school
  const from = t.month(st.from)
  const last = st.lastOwn || st.last
  const gaps = last ? [...visitPractices(data, last), ...schoolChecks(data, last)].filter((p) => !p.yes) : []
  const cards = kpiCards(data, st.all).filter((c) => c.group === 'fln' || c.group === 'upper')
  const inPlan = plan.has(sid)

  return (
    <>
      <div className="hello">
        <h1>{s.name}</h1>
        <p>
          {t.schoolType[s.type] || s.type} · {s.block} · UDISE {s.udise}
          {st.isFocus && <span className="tag"><Icon name="star" size={14} filled /> {t.focusBadge}</span>}
        </p>
      </div>

      <button className={`btn-primary btn-block plan-cta${inPlan ? ' on' : ''}`} onClick={() => nav.sheet({ kind: 'day', sid })}>
        <Icon name={inPlan ? 'check' : 'plan'} size={20} /> {inPlan ? t.inPlan : t.add}
      </button>

      <div className="tiles">
        <Tile label={t.tileOwnVisits(from)} value={st.own.length} />
        <Tile label={t.tileAllVisits} value={st.all.length} />
        <Tile label={t.tileLastVisit} value={st.lastOwn ? t.date(st.lastOwn.date).replace(/ \d{4}$/, '') : '—'} />
        {last?.stuEnr > 0 && last.stuPres != null && <Tile label={t.tileStudents} value={`${last.stuPres}/${last.stuEnr}`} />}
      </div>

      <Card title={t.monthsVisited} t={t} nav={nav}>
        <div className="month-strip">
          {st.strip.map((c) => (
            <div key={c.m} className={`ms${c.own ? ' on' : c.other ? ' other' : ''}${c.noData ? ' nodata' : ''}${c.m === month ? ' current' : ''}`}>
              <span className="ms-box">
                {c.noData ? '–' : c.own ? <Icon name="check" size={20} /> : c.other ? <Icon name="user" size={18} /> : <Icon name="cross" size={16} />}
              </span>
              <span className="ms-label">{t.monthShort(c.m)}</span>
            </div>
          ))}
        </div>
        <div className="legend">
          <span><i className="lg on" /> {t.legendOwn}</span>
          <span><i className="lg other" /> {t.legendOther}</span>
          <span><i className="lg none" /> {t.legendNone}</span>
        </div>
      </Card>

      {last && (
        <Card title={t.checkNext} sub={t.checkNextSub(t.date(last.date))} help="checkNext" t={t} nav={nav} tone={gaps.length ? 'warn' : 'good'}>
          {gaps.length ? (
            <ul className="check-list">
              {gaps.map((p) => (
                <li key={p.id} className="no">
                  <Icon name="cross" size={18} />
                  <span>{t.kpi(p.id)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Status tone="good">{t.nothingToCheck}</Status>
          )}
        </Card>
      )}

      {cards.length > 0 && (
        <>
          <SectionHead>{t.schoolKpis}</SectionHead>
          <p className="hint hint-tight">{t.schoolKpisSub(st.all.length)}</p>
          <div className="kpi-grid">
            {cards.map((c) => (
              <KpiCard key={c.id} t={t} label={t.kpi(c.id)} pct={c.pct} yes={c.yes} n={c.n} onClick={() => nav.kpiSheet(c.id, st.all)} />
            ))}
          </div>
        </>
      )}

      <SectionHead>{t.history(from)}</SectionHead>
      {st.all.length ? (
        <div className="rows">
          {st.all.map((v) => <VisitRow key={v.id} v={v} data={data} t={t} nav={nav} showWho id={id} />)}
        </div>
      ) : (
        <p className="empty">{t.noVisitsYet(from)}</p>
      )}
    </>
  )
}

// ======================================================================
// All my visits (from Home)
// ======================================================================

export function VisitsScreen({ data, t, id, month, months, rep, nav }) {
  const byDate = [...groupBy(rep.visits, (v) => v.date)].sort((a, b) => b[0].localeCompare(a[0]))
  return (
    <>
      <MonthStepper t={t} months={months} value={month} onChange={nav.setMonth} />
      {byDate.length ? (
        <>
          <p className="hint">{t.seeDetails}</p>
          {byDate.map(([d, vs]) => (
            <div key={d}>
              <SectionHead>{t.dayDate(d)}</SectionHead>
              <div className="rows">
                {vs.map((v) => <VisitRow key={v.id} v={v} data={data} t={t} nav={nav} id={id} />)}
              </div>
            </div>
          ))}
        </>
      ) : (
        <p className="empty">{t.nothingYet}</p>
      )}
    </>
  )
}

function VisitRow({ v, data, t, nav, showWho, id }) {
  const ps = visitPractices(data, v)
  const yes = ps.filter((p) => p.yes).length
  const isFocus = data.adoptedBy.get(id)?.some((s) => s.id === v.school)
  const p = visitPct(data, v)
  return (
    <button className="row" onClick={() => nav.visit(v)}>
      <span className="row-text">
        <b>
          {showWho ? t.date(v.date) : data.schools[v.school].name}
          {!showWho && isFocus && <span className="tag"><Icon name="star" size={14} filled /> {t.focusBadge}</span>}
        </b>
        <span>
          {showWho && <>{v.mentor === id ? <strong>{t.you}</strong> : data.mentors[v.mentor].name} · </>}
          {v.grade ? t.classN(v.grade) : ''} {t.subject(v.subject)}
          {v.teacher ? ` · ${v.teacher}` : ''}
        </span>
        {ps.length > 0 && <span className={`row-note text-${tone(p)}`}>{t.practicesSeen(yes, ps.length)}</span>}
      </span>
      <Icon name="next" />
    </button>
  )
}

export function VisitSheet({ data, t, v, onClose }) {
  const ps = visitPractices(data, v)
  const sc = schoolChecks(data, v)
  const fb = v.k[data.kpiIndex.feedback]
  const Item = ({ id, yes }) => (
    <li className={yes ? 'yes' : 'no'}>
      <Icon name={yes ? 'check' : 'cross'} size={18} />
      <span>{t.kpi(id)}</span>
      <b>{yes ? t.yes : t.no}</b>
    </li>
  )
  return (
    <Sheet title={data.schools[v.school].name} onClose={onClose} closeLabel={t.close}>
      <p className="sheet-meta">
        {t.date(v.date)} · {data.mentors[v.mentor].name}
        <br />
        {v.grade ? t.classN(v.grade) : ''} {t.subject(v.subject)}
        {v.teacher && <> · {t.teacher}: {v.teacher}</>}
        {v.minutes ? <><br />{t.minutes(Math.round(v.minutes))}</> : null}
      </p>
      {ps.length > 0 && (
        <>
          <h3 className="sheet-label">{t.practicesSeen(ps.filter((p) => p.yes).length, ps.length)}</h3>
          <ul className="check-list">{ps.map((p) => <Item key={p.id} {...p} />)}</ul>
        </>
      )}
      {(fb === '1' || fb === '0') && (
        <ul className="check-list"><Item id="feedback" yes={fb === '1'} /></ul>
      )}
      {sc.length > 0 && (
        <>
          <h3 className="sheet-label">{t.groupSchool}</h3>
          <ul className="check-list">{sc.map((p) => <Item key={p.id} {...p} />)}</ul>
        </>
      )}
    </Sheet>
  )
}

