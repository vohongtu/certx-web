import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { verifyHash } from '../api/certs.api'
import StatusBadge from '../components/StatusBadge'

export default function Verify() {
  const [sp] = useSearchParams()
  const [hash, setHash] = useState(sp.get('hash') || '')
  const [res, setRes] = useState<{status:'VALID'|'REVOKED'|'NOT_FOUND', metadata?:any} | null>(null)

  const doVerify = async () => {
    if (!hash) return
    const data = await verifyHash(hash)
    setRes(data)
  }

  useEffect(()=>{ if (hash) doVerify() }, [])

  return (
    <div style={{ maxWidth: 720, margin: '24px auto' }}>
      <h2>Tra cứu chứng chỉ</h2>
      <input 
        placeholder="Nhập hash" 
        value={hash} 
        onChange={e=>setHash(e.target.value)} 
      />
      <button onClick={doVerify}>Verify</button>

      {res && (
        <div style={{ marginTop: 16 }}>
          <StatusBadge status={res.status} />
          {res.metadata && (
            <ul>
              <li>Họ tên: {res.metadata.holderName}</li>
              <li>Văn bằng: {res.metadata.degree}</li>
              <li>Ngày cấp: {res.metadata.issuedDate}</li>
              <li>Đơn vị cấp: {res.metadata.issuerName}</li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
