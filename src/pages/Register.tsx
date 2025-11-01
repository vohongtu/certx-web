import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { register } from "../api/auth.api"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [err, setErr] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    setIsLoading(true)

    try {
      await register({ email, password, name, address })
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
          <h2 className="card-title">Tạo tài khoản Issuer</h2>
          <p className="card-subtitle">Đăng ký đơn vị cấp phát để đưa chứng chỉ của bạn lên blockchain CertX.</p>
        </header>

        {err && <div className="alert">⚠️ {err}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="issuer@certx.io" type="email" required />
          </div>
          <div className="field">
            <label>Mật khẩu</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <div className="field">
            <label>Tên đơn vị</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="CertX Academy" required />
          </div>
          <div className="field">
            <label>Ví phát hành (Ethereum)</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Đang đăng ký..." : "Đăng ký Issuer"}
          </button>
        </form>

        <p className="auth-meta">
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  )
}
