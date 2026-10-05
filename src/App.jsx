// "My ARP Report": a phone app for Basti ARPs. First run: pick a language, your
// block and your name (remembered on the phone). After that it opens on your
// month, with four tabs: Home (the month at a glance), Upcoming (a visit plan),
// Class KPIs (% cards with filters) and Focus schools (with a page per school).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadBasti } from './data.js'
import { makeT } from './i18n.js'
import { arpMonths, isoDate, monthReport } from './model.js'
import { isIos, useInstall } from './install.js'
import { usePlan } from './plan.js'
import { Icon, initials, Sheet } from './ui.jsx'
import {
  DaySheet,
  FocusScreen,
  HomeScreen,
  KpiScreen,
  KpiSheet,
  PlanScreen,
  SchoolPickSheet,
  SchoolScreen,
  SearchSheet,
  VisitSheet,
  VisitsScreen,
} from './screens.jsx'

const LANG_KEY = 'arp-report:lang'
const ME_KEY = 'arp-report:me'

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}
function writeStore(key, value) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // private mode: the choice just isn't remembered
  }
}

// ---------- Route: #/kpi?m=2026-08&c=hindi&f=focus · #/school/12 · #/start?b=Gaur ----------

const TABS = ['home', 'plan', 'kpi', 'focus']
const PARENT = { school: 'focus', visits: 'home' }

function parseHash() {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  const [page = '', id = null] = path.split('/').filter(Boolean)
  const q = Object.fromEntries(new URLSearchParams(query))
  return { page: page || 'home', id, q }
}

function toHash({ page, id, q = {} }) {
  const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v != null && v !== '')).toString()
  return `#/${page}${id != null ? `/${id}` : ''}${qs ? `?${qs}` : ''}`
}

// Loading/error text is needed before the data (and so the KPI list) exists.
const bootT = (lang) => makeT(lang || 'hi', { kpis: [] })

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [route, setRoute] = useState(parseHash)
  const [lang, setLangState] = useState(() => readStore(LANG_KEY))
  const [me, setMe] = useState(() => readStore(ME_KEY)?.id ?? null)
  const [online, setOnline] = useState(navigator.onLine)
  const [sheet, setSheetState] = useState(null)

  // An open sheet gets its own history entry, so the phone's back button closes it.
  const sheetRef = useRef(null)
  const setSheet = useCallback((next) => {
    if (next && !sheetRef.current) window.history.pushState({ inApp: true, sheet: true }, '', window.location.hash)
    sheetRef.current = next
    setSheetState(next)
  }, [])
  const closeSheet = useCallback(() => {
    if (window.history.state?.sheet) window.history.back()
    else {
      sheetRef.current = null
      setSheetState(null)
    }
  }, [])

  // Close the sheet, then act once the history entry it pushed is gone (so the action's URL sticks).
  const closeSheetThen = useCallback((fn) => {
    if (window.history.state?.sheet) {
      const after = () => {
        window.removeEventListener('popstate', after)
        fn()
      }
      window.addEventListener('popstate', after)
      window.history.back()
    } else {
      sheetRef.current = null
      setSheetState(null)
      fn()
    }
  }, [])

  useEffect(() => {
    setError(false)
    loadBasti().then(setData, () => setError(true))
  }, [attempt])

  useEffect(() => {
    const onNav = () => {
      setRoute(parseHash())
      sheetRef.current = null
      setSheetState(null)
    }
    const onNet = () => setOnline(navigator.onLine)
    window.addEventListener('popstate', onNav)
    window.addEventListener('hashchange', onNav)
    window.addEventListener('online', onNet)
    window.addEventListener('offline', onNet)
    return () => {
      window.removeEventListener('popstate', onNav)
      window.removeEventListener('hashchange', onNav)
      window.removeEventListener('online', onNet)
      window.removeEventListener('offline', onNet)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang || 'hi'
  }, [lang])

  // push: a page the phone's back button should return from. Otherwise replace (tabs, month, filters).
  const go = useCallback((next, { push = false } = {}) => {
    const hash = toHash(next)
    if (push) window.history.pushState({ inApp: true }, '', hash)
    else window.history.replaceState(window.history.state, '', hash)
    setRoute(parseHash())
    window.scrollTo(0, 0)
  }, [])

  const setLang = (l) => {
    writeStore(LANG_KEY, l)
    setLangState(l)
  }
  const choose = (id) => {
    writeStore(ME_KEY, id == null ? null : { id })
    setMe(id)
    sheetRef.current = null
    setSheetState(null)
    go({ page: id == null ? 'start' : 'home' })
  }

  // A link can name the ARP, e.g. sent by the district team: #/home?a=21
  useEffect(() => {
    const a = route.q.a == null ? null : +route.q.a
    if (a != null && data?.mentors[a]?.category === 'ARP' && a !== me) {
      writeStore(ME_KEY, { id: a })
      setMe(a)
    }
  }, [route.q.a, data, me])

  const t = useMemo(() => (data ? makeT(lang || 'hi', data.meta) : null), [lang, data])

  if (error) {
    return (
      <div className="center-screen">
        <Icon name="globe" size={48} />
        <p>{bootT(lang).loadError}</p>
        <button className="btn-primary" onClick={() => setAttempt((a) => a + 1)}>{bootT(lang).retry}</button>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="center-screen">
        <div className="spinner" />
        <p>{bootT(lang).loading}</p>
      </div>
    )
  }

  const mentor = me != null && data.mentors[me]?.category === 'ARP' ? data.mentors[me] : null
  if (!lang) return <LanguageScreen onChoose={setLang} />
  if (!mentor || route.page === 'start') return <Onboarding data={data} t={t} route={route} go={go} onChoose={choose} />

  return (
    <Main
      key={me}
      data={data}
      t={t}
      id={me}
      mentor={mentor}
      route={route}
      go={go}
      online={online}
      sheet={sheet}
      setSheet={setSheet}
      closeSheet={closeSheet}
      closeSheetThen={closeSheetThen}
      lang={lang}
      setLang={setLang}
      choose={choose}
    />
  )
}

// ---------- First run ----------

function LanguageScreen({ onChoose }) {
  return (
    <div className="onboard onboard-lang">
      <img src="icon.svg" alt="" className="onboard-logo" />
      <h1 className="onboard-title">
        <span lang="hi">मेरी ARP रिपोर्ट</span>
        <small lang="en">My ARP Report</small>
      </h1>
      <p className="onboard-q">
        <span lang="hi">अपनी भाषा चुनें</span>
        <small lang="en">Choose your language</small>
      </p>
      <button className="lang-btn" lang="hi" onClick={() => onChoose('hi')}>हिंदी</button>
      <button className="lang-btn" lang="en" onClick={() => onChoose('en')}>English</button>
    </div>
  )
}

function Onboarding({ data, t, route, go, onChoose }) {
  const [q, setQ] = useState('')
  const arps = useMemo(() => data.mentors.filter((m) => m.category === 'ARP').sort((a, b) => a.name.localeCompare(b.name)), [data])
  const blocks = useMemo(() => [...new Set(arps.map((m) => m.block))].sort(), [arps])
  const block = route.q.b
  const needle = q.trim().toLowerCase()
  const names = needle ? arps.filter((m) => m.name.toLowerCase().includes(needle)) : arps.filter((m) => m.block === block)
  const back = () => (window.history.state?.inApp ? window.history.back() : go({ page: 'start' }))

  return (
    <div className="onboard">
      <header className="appbar">
        {block && !needle ? (
          <button className="icon-btn" onClick={back} aria-label={t.back}>
            <Icon name="back" />
          </button>
        ) : (
          <img src="icon.svg" alt="" className="appbar-logo" />
        )}
        <div className="appbar-title">{t.appName} · {t.district}</div>
      </header>

      <div className="onboard-body screen">
        <div className="step-label">{t.step(block || needle ? 2 : 1)}</div>
        <h1 className="onboard-h">{block || needle ? t.chooseName : t.chooseBlock}</h1>

        <label className="search">
          <Icon name="search" size={22} />
          <input type="search" placeholder={t.orSearch} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>

        {!block && !needle ? (
          <div className="choice-grid">
            {blocks.map((b) => (
              <button key={b} className="choice" onClick={() => go({ page: 'start', q: { b } }, { push: true })}>
                {b}
              </button>
            ))}
          </div>
        ) : (
          <div className="choice-list">
            {block && !needle && <div className="list-head">{block}</div>}
            {names.map((m) => (
              <button key={m.id} className="person" onClick={() => onChoose(m.id)}>
                <span className="avatar">{initials(m.name)}</span>
                <span className="person-text">
                  <b>{m.name}</b>
                  <span>{needle ? `${m.block} · ` : ''}{t.focusCount((data.adoptedBy.get(m.id) || []).length)}</span>
                </span>
                <Icon name="next" />
              </button>
            ))}
            {!names.length && <p className="muted-text">{t.noMatch}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- The app ----------

function Main({ data, t, id, mentor, route, go, online, sheet, setSheet, closeSheet, closeSheetThen, lang, setLang, choose }) {
  const months = arpMonths(data)
  const latest = months[months.length - 1]
  const today = isoDate(new Date())
  const page = TABS.includes(route.page) || PARENT[route.page] ? route.page : 'home'
  const month = months.includes(route.q.m) ? route.q.m : latest
  const kpiFilters = {
    month: route.q.m === 'all' || months.includes(route.q.m) ? route.q.m : latest,
    cls: route.q.c || '',
    schools: route.q.f || '',
    school: route.q.s || '',
  }
  const rep = useMemo(() => monthReport(data, id, month), [data, id, month])
  const plan = usePlan(id)
  const inst = useInstall()
  const install = async () => {
    if (!(await inst.prompt())) setSheet({ kind: 'install' })
  }

  // The month travels with you between tabs; the KPI filters stay on the KPI tab.
  const q = month === latest ? {} : { m: month }
  const nav = {
    tab: (p) => go({ page: p, q }),
    open: (p, pid) => go({ page: p, id: pid, q }, { push: true }),
    setMonth: (m) => go({ page, id: route.id, q: { ...route.q, m: m === latest ? '' : m } }),
    openDay: (d) => go({ page: 'visits', q: { ...q, d } }, { push: true }),
    setKpi: (patch) => go({ page: 'kpi', q: { ...route.q, ...patch, m: (patch.m ?? route.q.m) === latest ? '' : patch.m ?? route.q.m } }),
    openKpi: (patch) => go({ page: 'kpi', q: { ...q, ...patch, m: (patch.m ?? month) === latest ? '' : patch.m ?? month } }),
    back: () => (window.history.state?.inApp ? window.history.back() : go({ page: PARENT[page] || 'home', q })),
    help: (key) => setSheet({ kind: 'help', key }),
    visit: (v) => setSheet({ kind: 'visit', v }),
    kpiSheet: (kpi, visits, filters) => setSheet({ kind: 'kpi', kpi, visits, filters }),
    sheet: (s) => setSheet(s),
  }
  const props = { data, t, id, month, months, latest, today, rep, nav, plan }

  let body
  if (page === 'school') body = <SchoolScreen {...props} sid={+route.id} />
  else if (page === 'visits') body = <VisitsScreen {...props} day={route.q.d} />
  else if (page === 'plan') body = <PlanScreen {...props} />
  else if (page === 'kpi') body = <KpiScreen {...props} filters={kpiFilters} />
  else if (page === 'focus') body = <FocusScreen {...props} />
  else body = <HomeScreen {...props} mentor={mentor} />

  const sub = !!PARENT[page]
  const title = page === 'school' ? data.schools[+route.id]?.name : page === 'visits' ? t.visitsTitle : t.appName
  const pending = plan.items.filter((it) => !it.done).length

  return (
    <div className={`app${sub ? ' app-sub' : ''}`}>
      <header className="appbar">
        {sub ? (
          <button className="icon-btn" onClick={nav.back} aria-label={t.back}>
            <Icon name="back" />
          </button>
        ) : (
          <img src="icon.svg" alt="" className="appbar-logo" />
        )}
        <div className="appbar-title">{title}</div>
        <button className="avatar avatar-btn" onClick={() => setSheet({ kind: 'profile' })} aria-label={t.profile}>
          {initials(mentor.name)}
        </button>
      </header>
      {!online && <div className="offline" role="status">{t.offline}</div>}

      <main className={`screen${sub ? ' screen-push' : ''}`} key={`${page}/${route.id}`}>
        {page === 'home' && !inst.installed && !inst.dismissed && (
          <section className="install-banner">
            <img src="icon-192.png" alt="" />
            <div className="install-text">
              <b>{t.installTitle}</b>
              <span>{t.installSub}</span>
              <div className="install-actions">
                <button className="btn-primary" onClick={install}>
                  <Icon name="plus" size={20} /> {t.installBtn}
                </button>
                <button className="link-btn" onClick={inst.dismiss}>{t.installLater}</button>
              </div>
            </div>
          </section>
        )}
        {body}
      </main>

      {!sub && (
        <nav className="tabbar">
          {[
            ['home', 'home', t.tabHome, null],
            ['plan', 'plan', t.tabPlan, pending || null],
            ['kpi', 'gauge', t.tabKpi, null],
            ['focus', 'star', t.tabFocus, rep.focus.inScope && rep.focus.todo.length ? rep.focus.todo.length : null],
          ].map(([p, icon, label, count]) => (
            <button key={p} className={page === p ? 'on' : ''} aria-current={page === p ? 'page' : undefined} onClick={() => nav.tab(p)}>
              <span className="tab-icon">
                <Icon name={icon} filled={page === p && icon === 'star'} />
                {count != null && <i className={`tab-count${p === 'plan' ? ' tab-count-info' : ''}`} aria-hidden>{count}</i>}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {sheet?.kind === 'install' && (
        <Sheet title={t.installHow} onClose={closeSheet} closeLabel={t.close}>
          <p className="note">{t.whatsappFirst}</p>
          {(isIos() ? ['ios', 'android'] : ['android', 'ios']).map((os) => (
            <div key={os} className="install-os">
              <h3 className="sheet-label">{os === 'ios' ? t.iosTitle : t.androidTitle}</h3>
              <ol className="steps">
                {(os === 'ios' ? t.iosSteps : t.androidSteps).map((step, i) => (
                  <li key={i}><span className="step-n">{i + 1}</span><span>{step}</span></li>
                ))}
              </ol>
            </div>
          ))}
        </Sheet>
      )}
      {sheet?.kind === 'help' && (
        <Sheet title={t.help} onClose={closeSheet} closeLabel={t.close}>
          <p className="sheet-text">{t.helpText[sheet.key]}</p>
        </Sheet>
      )}
      {sheet?.kind === 'visit' && <VisitSheet data={data} t={t} v={sheet.v} onClose={closeSheet} />}
      {sheet?.kind === 'kpi' && (
        <KpiSheet
          data={data}
          t={t}
          id={id}
          kpi={sheet.kpi}
          visits={sheet.visits}
          filters={sheet.filters}
          months={months}
          onVisit={(v) => setSheet({ kind: 'visit', v })}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'schoolPick' && (
        <SchoolPickSheet data={data} t={t} id={id} filters={sheet.filters} onPick={(s) => closeSheetThen(() => nav.setKpi({ s }))} onClose={closeSheet} />
      )}
      {sheet?.kind === 'day' && <DaySheet data={data} t={t} sid={sheet.sid} today={today} plan={plan} onClose={closeSheet} />}
      {sheet?.kind === 'search' && <SearchSheet data={data} t={t} mentor={mentor} onPick={(sid) => setSheet({ kind: 'day', sid })} onClose={closeSheet} />}
      {sheet?.kind === 'allHelp' && (
        <Sheet title={t.helpTitle} onClose={closeSheet} closeLabel={t.close}>
          {[
            ['visits', t.visitsCard],
            ['focus', t.tabFocus],
            ['kpi', t.kpiTitle],
            ['practice', t.tilePractice],
            ['helpWith', t.helpCard],
            ['checkNext', t.checkNext],
            ['plan', t.myPlan],
            ['days', t.tileDays],
            ['data', t.aboutData],
          ].map(([k, label]) => (
            <div key={k} className="help-item">
              <h3>{label}</h3>
              <p>{t.helpText[k]}</p>
            </div>
          ))}
        </Sheet>
      )}
      {sheet?.kind === 'profile' && (
        <Sheet title={t.profile} onClose={closeSheet} closeLabel={t.close}>
          <div className="profile">
            <span className="avatar avatar-lg">{initials(mentor.name)}</span>
            <div>
              <b>{mentor.name}</b>
              <div className="muted-text">ARP · {mentor.block} · {t.district}</div>
            </div>
          </div>
          <div className="sheet-label"><Icon name="globe" size={20} /> {t.language}</div>
          <div className="segmented">
            <button className={lang === 'hi' ? 'on' : ''} aria-pressed={lang === 'hi'} onClick={() => setLang('hi')} lang="hi">हिंदी</button>
            <button className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')} lang="en">English</button>
          </div>
          {inst.installed ? (
            <p className="status status-good"><Icon name="check" size={20} /> <span>{t.installDone}</span></p>
          ) : (
            <button className="list-btn list-btn-install" onClick={install}>
              <Icon name="plus" /> <span>{t.installMenu}</span> <Icon name="next" />
            </button>
          )}
          <button className="list-btn" onClick={() => setSheet({ kind: 'allHelp' })}>
            <Icon name="help" /> <span>{t.helpTitle}</span> <Icon name="next" />
          </button>
          <button className="list-btn" onClick={() => choose(null)}>
            <Icon name="swap" /> <span>{t.changePerson}</span> <Icon name="next" />
          </button>
        </Sheet>
      )}
    </div>
  )
}
