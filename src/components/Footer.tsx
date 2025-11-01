export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <span>© {year} CertX. Nền tảng quản lý & xác thực chứng chỉ.</span>
        <span className="auth-meta">Made with ♢ blockchain, IPFS & CertX dApp.</span>
      </div>
    </footer>
  )
}
