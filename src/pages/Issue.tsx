import { useState } from "react"
import { issueCert, revokeCert } from "../api/certs.api"
import FilePicker from "../components/FilePicker"
import QRViewer from "../components/QRViewer"

export default function Issue() {
  const [file, setFile] = useState<File | null>(null)
  const [holderName, setHolderName] = useState("")
  const [degree, setDegree] = useState("")
  const [issuedDate, setIssuedDate] = useState("")
  const [result, setResult] = useState<{ hash: string; verifyUrl: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doIssue = async () => {
    if (!file) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("holderName", holderName)
      fd.append("degree", degree)
      fd.append("issuedDate", issuedDate)
      
      const res = await issueCert(fd)
      setResult({ hash: res.hash, verifyUrl: res.verifyUrl })
    } catch (err: any) {
      console.error("Issue error:", err)
      setError(err.response?.data?.message || err.message || "Có lỗi xảy ra khi cấp phát chứng chỉ")
    } finally {
      setIsLoading(false)
    }
  }

  const doRevoke = async () => {
    if (!result?.hash) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      await revokeCert(result.hash)
      alert("Đã thu hồi chứng chỉ!")
    } catch (err: any) {
      console.error("Revoke error:", err)
      setError(err.response?.data?.message || err.message || "Có lỗi xảy ra khi thu hồi chứng chỉ")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>Cấp phát chứng chỉ</h2>
      <FilePicker onPick={setFile} />
      <input
        placeholder="Họ tên"
        value={holderName}
        onChange={(e) => setHolderName(e.target.value)}
      />
      <input
        placeholder="Văn bằng (VD: BSc CS)"
        value={degree}
        onChange={(e) => setDegree(e.target.value)}
      />
      <input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
      <button onClick={doIssue} disabled={!file || isLoading}>
        {isLoading ? "Đang xử lý..." : "Issue"}
      </button>

      {error && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: "#fee", border: "1px solid #fcc", borderRadius: 4 }}>
          <p style={{ color: "#c33", margin: 0 }}>❌ {error}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <p>
            <b>Hash:</b> {result.hash}
          </p>
          <a href={result.verifyUrl} target="_blank">
            Mở trang Verify
          </a>
          <QRViewer value={result.verifyUrl} />
          <button onClick={doRevoke} disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Revoke"}
          </button>
        </div>
      )}
    </div>
  )
}
