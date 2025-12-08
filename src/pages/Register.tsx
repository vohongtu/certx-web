import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { register } from "../api/auth.api"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [err, setErr] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const nav = useNavigate()
  const location = useLocation()

  // Reset form khi component mount hoặc khi navigate đến trang này
  useEffect(() => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setName("")
    setErr("")
    setShowPassword(false)
    setShowConfirmPassword(false)
  }, [location.pathname])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")

    // Validate mật khẩu và xác nhận mật khẩu
    if (password !== confirmPassword) {
      setErr("Mật khẩu và xác nhận mật khẩu không khớp")
      return
    }

    if (password.length < 6) {
      setErr("Mật khẩu phải có ít nhất 6 ký tự")
      return
    }

    setIsLoading(true)

    try {
      await register({ email, password, name })
      nav("/login")
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Đăng ký thất bại")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <header className="card-header">
          <h2 className="card-title">Tạo tài khoản</h2>
          <p className="card-subtitle">Đăng ký tài khoản để sử dụng dịch vụ CertX.</p>
        </header>

        {err && <div className="alert">⚠️ {err}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="user@example.com" 
              type="email" 
              autoComplete="off"
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
                autoComplete="new-password"
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
          <div className="field">
            <label>Xác nhận mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••" 
                autoComplete="new-password"
                required
                style={{ paddingRight: '45px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showConfirmPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>
          <div className="field">
            <label>Họ tên</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Nguyễn Văn A" 
              autoComplete="off"
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="auth-meta">
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  )
}
