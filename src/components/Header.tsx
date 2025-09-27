import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
      <b>CertX</b> · <Link to="/verify">Verify</Link> · <Link to="/issue">Issue</Link> · <Link to="/login">Login</Link>
    </div>
  )
}
