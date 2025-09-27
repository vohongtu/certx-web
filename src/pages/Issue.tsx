import { useState } from 'react'
import { issueCert, revokeCert } from '../api/certs.api'
import FilePicker from '../components/FilePicker'
import QRViewer from '../components/QRViewer'

export default function Issue() {
  const [file, setFile] = useState<File | null>(null)
  const [holderName, setHolderName] = useState('')
  const [degree, setDegree] = useState('')
  const [issuedDate, setIssuedDate] = useState('')
  const [result, setResult] = useState<{hash:string, verifyUrl:string} | null>(null)

  const doIssue = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('holderName', holderName)
    fd.append('degree', degree)
    fd.append('issuedDate', issuedDate)
    const res = await issueCert(fd)
    setResult({ hash: res.hash, verifyUrl: res.verifyUrl })
  }

  const doRevoke = async () => {
    if (!result?.hash) return
    await revokeCert(result.hash)
    alert('Đã thu hồi chứng chỉ!')
  }

  return (
    <div style={{ maxWidth: 720, margin: '24px auto' }}>
      <h2>Cấp phát chứng chỉ</h2>
      <FilePicker onPick={setFile} />
      <input 
        placeholder="Họ tên" 
        value={holderName} 
        onChange={e=>setHolderName(e.target.value)} 
      />
      <input 
        placeholder="Văn bằng (VD: BSc CS)" 
        value={degree} 
        onChange={e=>setDegree(e.target.value)} 
      />
      <input 
        type="date" 
        value={issuedDate} 
        onChange={e=>setIssuedDate(e.target.value)} 
      />
      <button onClick={doIssue} disabled={!file}>Issue</button>

      {result && (
        <div style={{ marginTop: 16 }}>
          <p><b>Hash:</b> {result.hash}</p>
          <a href={result.verifyUrl} target="_blank">Mở trang Verify</a>
          <QRViewer value={result.verifyUrl} />
          <button onClick={doRevoke}>Revoke</button>
        </div>
      )}
    </div>
  )
}
