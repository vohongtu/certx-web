import { useEffect, useMemo, useState } from 'react'
import { decodeJwt } from '../utils/jwt'

const AUTH_EVENT = 'certx-auth-change'

export function useAuth() {
  const storageKey = import.meta.env.VITE_STORAGE_TOKEN
  const storageExpKey = useMemo(() => `${storageKey}_exp`, [storageKey])
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(storageKey))
  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(storageExpKey)
    return raw ? Number(raw) : null
  })

  useEffect(() => {
    const update = () => {
      setToken(localStorage.getItem(storageKey))
      const raw = localStorage.getItem(storageExpKey)
      setExpiresAt(raw ? Number(raw) : null)
    }

    window.addEventListener('storage', update)
    window.addEventListener(AUTH_EVENT, update as EventListener)

    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener(AUTH_EVENT, update as EventListener)
    }
  }, [storageKey])

  const notify = () => window.dispatchEvent(new Event(AUTH_EVENT))

  const save = (jwt: string) => {
    localStorage.setItem(storageKey, jwt)
    const decoded = decodeJwt(jwt)
    if (decoded?.exp) {
      const ms = decoded.exp * 1000
      localStorage.setItem(storageExpKey, String(ms))
      setExpiresAt(ms)
    } else {
      localStorage.removeItem(storageExpKey)
      setExpiresAt(null)
    }
    setToken(jwt)
    notify()
  }

  const clear = () => {
    localStorage.removeItem(storageKey)
    localStorage.removeItem(storageExpKey)
    setToken(null)
    setExpiresAt(null)
    notify()
  }

  const isExpired = token && expiresAt ? Date.now() > expiresAt : false

  return { token, save, clear, expiresAt, isExpired }
}
