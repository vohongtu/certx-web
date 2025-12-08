import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { login } from "../api/auth.api"
import { useAuth } from "../hooks/useAuth"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
            <div style={{ position: 'relative' }}>
            <input
                type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
                style={{ paddingRight: '45px' }}
            />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#2563eb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#64748b'
                }}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
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
