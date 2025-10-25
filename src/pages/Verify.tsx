import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { verifyHash } from "../api/certs.api"
import StatusBadge from "../components/StatusBadge"
import { getCertIPFSData } from "../api/ipfs.api"
import CertIPFS from "../interfaces/cert.interface"

export default function Verify() {
  const [sp] = useSearchParams()
  const [hash, setHash] = useState(sp.get("hash") || "")
  const [res, setRes] = useState<{
    status: "VALID" | "REVOKED" | "NOT_FOUND"
    data: CertIPFS
  } | null>(null)
  const [file, setFile] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doVerify = async () => {
    if (!hash) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { status, metadataURI } = await verifyHash(hash)

      // Kiểm tra nếu certificate không tồn tại
      if (status === "NOT_FOUND" || !metadataURI) {
        setRes({ status: "NOT_FOUND", data: null as any })
        return
      }

      const data = await getCertIPFSData(metadataURI)
      const bufferObj = data.file
      const uint8Array = new Uint8Array(bufferObj.data)
      const blob = new Blob([uint8Array], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      console.log(data)
      setFile(url)
      setRes({ status, data })
    } catch (err: any) {
      console.error("Verify error:", err)
      setError(err.response?.data?.message || err.message || "Có lỗi xảy ra khi tra cứu chứng chỉ")
    } finally {
      setIsLoading(false)
    }
  }

  // useEffect(() => {
  //   if (hash) doVerify()
  // }, [])

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>Tra cứu chứng chỉ</h2>
      <input placeholder="Nhập hash" value={hash} onChange={(e) => setHash(e.target.value)} />
      <button onClick={doVerify} disabled={!hash || isLoading}>
        {isLoading ? "Đang tra cứu..." : "Verify"}
      </button>

      {error && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: "#fee", border: "1px solid #fcc", borderRadius: 4 }}>
          <p style={{ color: "#c33", margin: 0 }}>❌ {error}</p>
        </div>
      )}

      {res && (
        <div style={{ marginTop: 16 }}>
          <StatusBadge status={res.status} />
          {res.status === "NOT_FOUND" ? (
            <p style={{ color: "#c33", marginTop: 16 }}>
              ❌ Không tìm thấy chứng chỉ với hash này
            </p>
          ) : res.data ? (
            <ul>
              <li>Họ tên: {res.data.holderName}</li>
              <li>Văn bằng: {res.data.degree}</li>
              <li>Ngày cấp: {res.data.issuedDate}</li>
              <li>Đơn vị cấp: {res.data.issuerName}</li>
              <li>
                {file ? <iframe src={file} width="100%" height="600px" /> : <p>Loading...</p>}
              </li>
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}
