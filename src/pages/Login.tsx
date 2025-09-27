import { useState } from 'react'
import { login } from '../api/auth.api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('issuer@example.com')
  const [password, setPassword] = useState('secret123')
  const [err, setErr] = useState('')
  const nav = useNavigate()
  const { save } = useAuth()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    try {
      const { token } = await login(email, password)
      save(token)
      nav('/issue')
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Đăng nhập thất bại')
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Đăng nhập Issuer</h2>
      <form onSubmit={submit}>
        <input 
          value={email} 
          onChange={e=>setEmail(e.target.value)} 
          placeholder="Email" 
        />
        <input 
          type="password" 
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
          placeholder="Mật khẩu" 
        />
        <button type="submit">Đăng nhập</button>
      </form>
      {err && <p style={{ color:'red' }}>{err}</p>}
    </div>
  )
}
