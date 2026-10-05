// The ARP's visit plan, kept on this phone only (localStorage), one list per ARP.
// Item: { key, sid, date: 'YYYY-MM-DD' | null, done: bool, added: 'YYYY-MM-DD' }
import { useCallback, useState } from 'react'
import { daysBetween, isoDate } from './model.js'

const key = (id) => `arp-report:plan:${id}`

function read(id) {
  try {
    const items = JSON.parse(localStorage.getItem(key(id)) || '[]')
    const today = isoDate(new Date())
    // finished items drop off after 45 days
    return items.filter((it) => !it.done || daysBetween(it.date || it.added, today) <= 45)
  } catch {
    return []
  }
}

export function usePlan(id) {
  const [items, setItems] = useState(() => read(id))
  const save = useCallback(
    (fn) =>
      setItems((cur) => {
        const next = fn(cur)
        try {
          localStorage.setItem(key(id), JSON.stringify(next))
        } catch {
          // private mode: the plan lasts until the page closes
        }
        return next
      }),
    [id],
  )
  return {
    items,
    has: (sid) => items.some((it) => it.sid === sid && !it.done),
    // adding a school that is already planned just moves it to the new date
    add: (sid, date) =>
      save((cur) => [
        ...cur.filter((it) => it.sid !== sid || it.done),
        { key: `${sid}-${Date.now()}`, sid, date, done: false, added: isoDate(new Date()) },
      ]),
    toggle: (k) => save((cur) => cur.map((it) => (it.key === k ? { ...it, done: !it.done } : it))),
    remove: (k) => save((cur) => cur.filter((it) => it.key !== k)),
  }
}
