import { useEffect, useState } from 'react'

export function useAuth() {
  const [token, setToken] = useState<string | null>(null)
  
  useEffect(() => {
    setToken(localStorage.getItem('certx_token'))
  }, [])
  
  const save = (t: string) => { 
    localStorage.setItem('certx_token', t)
    setToken(t) 
  }
  
  const clear = () => { 
    localStorage.removeItem('certx_token')
    setToken(null) 
  }
  
  return { token, save, clear }
}
