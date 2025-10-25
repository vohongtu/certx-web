import { useState } from "react"
import { register } from "../api/auth.api"
import { useNavigate } from "react-router-dom"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [err, setErr] = useState("")
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    try {
      await register({ email, password, name, address })

      nav("/login")
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Đăng ký thất bại")
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Đăng ký Issuer</h2>
      <form onSubmit={submit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
        />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
        <button type="submit">Đăng ký</button>
      </form>
      {err && <p style={{ color: "red" }}>{err}</p>}
    </div>
  )
}
