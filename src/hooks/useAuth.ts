import { useEffect, useState } from "react"

export function useAuth() {
  const [token, setToken] = useState<string | null>(null)
  const storageKey = import.meta.env.VITE_STORAGE_TOKEN

  useEffect(() => {
    setToken(localStorage.getItem(storageKey))
  }, [])

  const save = (token: string) => {
    localStorage.setItem(storageKey, token)
    setToken(token)
  }

  const clear = () => {
    localStorage.removeItem(storageKey)
    setToken(null)
  }

  return { token, save, clear }
}
