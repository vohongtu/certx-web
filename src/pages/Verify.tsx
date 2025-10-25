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

  const doVerify = async () => {
    if (!hash) return
    const { status, metadataURI } = await verifyHash(hash)

    const data = await getCertIPFSData(metadataURI)
    const bufferObj = data.file
    const uint8Array = new Uint8Array(bufferObj.data)
    const blob = new Blob([uint8Array], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)

    console.log(data)
    setFile(url)
    setRes({ status, data })
  }

  // useEffect(() => {
  //   if (hash) doVerify()
  // }, [])

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>Tra cứu chứng chỉ</h2>
      <input placeholder="Nhập hash" value={hash} onChange={(e) => setHash(e.target.value)} />
      <button onClick={doVerify}>Verify</button>

      {res && (
        <div style={{ marginTop: 16 }}>
          <StatusBadge status={res.status} />
          {res.data && (
            <ul>
              <li>Họ tên: {res.data.holderName}</li>
              <li>Văn bằng: {res.data.degree}</li>
              <li>Ngày cấp: {res.data.issuedDate}</li>
              <li>Đơn vị cấp: {res.data.issuerName}</li>
              <li>
                {file ? <iframe src={file} width="100%" height="600px" /> : <p>Loading...</p>}
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
