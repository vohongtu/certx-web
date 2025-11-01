import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { login } from "../api/auth.api"
import { useAuth } from "../hooks/useAuth"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [err, setErr] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const nav = useNavigate()
  const { save } = useAuth()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    setIsLoading(true)

    try {
      const { token } = await login(email, password)
      save(token)
      nav("/issue")
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Đăng nhập thất bại")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <header className="card-header">
          <h2 className="card-title">Đăng nhập Issuer</h2>
          <p className="card-subtitle">Truy cập bảng điều khiển để cấp phát và quản lý chứng chỉ.</p>
        </header>

        {err && <div className="alert">⚠️ {err}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="issuer@certx.io"
              type="email"
              required
            />
          </div>
          <div className="field">
            <label>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="auth-meta">
          Chưa có tài khoản? <Link to="/register">Đăng ký Issuer</Link>
        </p>
      </div>
    </div>
  )
}
