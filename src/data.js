// Loads Basti's visit data from the ARP dashboard's published site and decodes it.
// The file format is produced by etl/build.py in the arp-ssp-dashboard repo; the
// decoder below mirrors web/src/data.js there, so keep the two in step.

export const DATA_BASE = import.meta.env.VITE_DATA_BASE || 'https://adichandrashekar.github.io/arp-ssp-dashboard/data/'
const DISTRICT = 'basti'

// First month the app shows (ARP visits before this are sparse).
export const TREND_FROM = '2025-07'

// no-cache: revalidate every load so a data refresh shows up immediately
async function getJson(path) {
  const res = await fetch(DATA_BASE + path, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`)
  return res.json()
}

export async function loadBasti() {
  const index = await getJson('index.json')
  const entry = index.districts.find((d) => d.slug === DISTRICT)
  if (!entry) throw new Error('Basti is missing from the data index')
  return decode(await getJson(entry.file)) // e.g. "districts/basti.json"
}

function decode(raw) {
  const { meta, mentors, schools, teachers } = raw
  const f = Object.fromEntries(meta.visitFields.map((name, i) => [name, i]))
  const kpiIndex = Object.fromEntries(meta.kpis.map((k, i) => [k.id, i]))

  const visits = raw.visits.map((r, id) => {
    const school = schools[r[f.school]]
    return {
      id,
      date: r[f.date],
      month: r[f.date].slice(0, 7),
      mentor: r[f.mentor],
      school: r[f.school],
      block: school.block,
      stype: school.type,
      grade: r[f.grade],
      subject: r[f.subject] == null ? null : meta.subjects[r[f.subject]],
      form: r[f.form],
      minutes: r[f.minutes],
      stuEnr: r[f.stu_enr],
      stuPres: r[f.stu_pres],
      teacher: r[f.teacher] == null ? null : teachers[r[f.teacher]],
      k: r[f.kpis],
    }
  })

  const months = [...new Set(visits.map((v) => v.month))].sort()
  // adopting ARP (mentor id) -> their focus schools
  const adoptedBy = new Map()
  for (const s of schools) {
    if (!s.ssp || s.sspArp == null) continue
    if (!adoptedBy.has(s.sspArp)) adoptedBy.set(s.sspArp, [])
    adoptedBy.get(s.sspArp).push(s)
  }
  return { meta, mentors, schools, visits, months, kpiIndex, adoptedBy }
}

export function groupBy(arr, fn) {
  const m = new Map()
  for (const x of arr) {
    const k = fn(x)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(x)
  }
  return m
}
