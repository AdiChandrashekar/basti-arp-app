// "Install this app" support. Chrome on Android fires `beforeinstallprompt` once,
// early, when the app can be installed; we keep it so a button can show the
// native install dialog later. Imported first in main.jsx so the event isn't missed.
import { useEffect, useState } from 'react'

let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  try {
    localStorage.setItem('arp-report:installed', '1')
  } catch {
    // ignore
  }
  notify()
})

const DISMISS_KEY = 'arp-report:install-dismissed'

function isInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    (() => {
      try {
        return localStorage.getItem('arp-report:installed') === '1'
      } catch {
        return false
      }
    })()
  )
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function useInstall() {
  const [, force] = useState(0)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    const fn = () => force((n) => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return {
    installed: isInstalled(),
    canPrompt: !!deferred,
    dismissed,
    // Shows Chrome's own install dialog. Returns false if it isn't available.
    prompt: async () => {
      if (!deferred) return false
      deferred.prompt()
      await deferred.userChoice.catch(() => null)
      deferred = null
      notify()
      return true
    },
    dismiss: () => {
      try {
        localStorage.setItem(DISMISS_KEY, '1')
      } catch {
        // ignore
      }
      setDismissed(true)
    },
  }
}
