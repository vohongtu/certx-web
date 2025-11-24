import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { verifyHash, CertStatus } from '../api/certs.api'
import StatusBadge from '../components/StatusBadge'
import PdfViewer from '../components/PdfViewer'
import { getCertIPFSData } from '../api/ipfs.api'
import CertIPFS from '../interfaces/cert.interface'
import { formatDateShort, formatDateRange } from '../utils/format'
import { calculateStatus } from '../utils/status'
import { useAuth } from '../hooks/useAuth'
import { decodeJwt } from '../utils/jwt'
import QRViewer from '../components/QRViewer'

type VerifyResult = {
  status: CertStatus | 'NOT_FOUND'
  data: CertIPFS | null
  metadataUri?: string
}

export default function Verify() {
  const [sp] = useSearchParams()
  const { token } = useAuth()
  const [hash, setHash] = useState(sp.get('hash') || '')
  const [res, setRes] = useState<VerifyResult | null>(null)
  const [file, setFile] = useState<{ url: string; mimeType: string; blob?: Blob } | null>(null)
  const [source, setSource] = useState<'chain' | 'db' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Kiểm tra role của user
  const userRole = useMemo(() => {
    if (!token) return null
    const decoded = decodeJwt(token)
    return (decoded as any)?.role || null
  }, [token])

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'

  useEffect(() => {
    return () => {
      if (file) URL.revokeObjectURL(file.url)
    }
  }, [file])

  const doVerify = async () => {
    if (!hash) return

    setIsLoading(true)
    setError(null)
    setRes(null)
    setFile(null)
    setSource(null)

    try {
      const { status, metadataURI, source: apiSource } = await verifyHash(hash)

      if (status === 'NOT_FOUND' || !metadataURI) {
        setRes({ status: 'NOT_FOUND', data: null, metadataUri: undefined })
        setSource(apiSource ?? null)
        return
      }

      const data = await getCertIPFSData(metadataURI)
      const metadataUri = metadataURI
      setSource(apiSource ?? 'chain')

      // Tính toán status dựa trên expirationDate từ metadata
      const finalStatus = calculateStatus(status, data.expirationDate)

      let uint8Array: Uint8Array | null = null
      const filePayload = (data as any)?.file

      if (filePayload?.data) uint8Array = new Uint8Array(filePayload.data)
      else if (Array.isArray(filePayload)) uint8Array = new Uint8Array(filePayload)

      if (uint8Array) {
        const mimeType = data.mimeType || 'application/pdf'
        const normalized = Uint8Array.from(uint8Array)
        const blob = new Blob([normalized], { type: mimeType })
        // Tạo URL cho image, giữ Blob cho PDF để truyền trực tiếp
        const url = URL.createObjectURL(blob)
        setFile({ url, mimeType, blob: mimeType.startsWith('image/') ? undefined : blob })
      }

      setRes({ status: finalStatus, data, metadataUri })
    } catch (err: any) {
      console.error('Verify error:', err)
      setFile(null)
      setRes(null)
      setSource(null)
      setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi tra cứu chứng chỉ')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    doVerify()
  }

  const infoList = res?.data
    ? [
        { label: 'Họ tên', value: res.data.holderName },
        { label: 'Văn bằng', value: res.data.degree },
        { label: 'Ngày cấp - Ngày hết hạn', value: formatDateRange(res.data.issuedDate, res.data.expirationDate) },
        { label: 'Ngày xác thực', value: formatDateShort(res.data.certxIssuedDate) },
        { 
          label: 'Đơn vị cấp', 
          value: `CertX - ${res.data.approvedBy || res.data.issuerId || 'N/A'}` 
        },
        res.data.watermarkOriginalText
          ? { label: 'Chuỗi watermark gốc', value: res.data.watermarkOriginalText }
          : null,
        res.data.watermarkFontPath
          ? { label: 'Font watermark', value: res.data.watermarkFontPath }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>
    : []

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <div className='page-eyebrow'>Verification Portal</div>
          <h1 className='page-title'>Tra cứu chứng chỉ CertX</h1>
          <p className='page-subtitle'>Nhập hash được cấp phát để xác thực trạng thái và xem chứng chỉ.</p>
        </div>
      </div>

      <form className='card card--subtle' onSubmit={handleSubmit}>
        <div className='form-grid'>
          <div className='field'>
            <label>Hash chứng chỉ</label>
            <input value={hash} onChange={(e) => setHash(e.target.value)} placeholder='0x...' />
          </div>
        </div>
        <div className='card-footer'>
          <button className='btn btn-primary' type='submit' disabled={!hash || isLoading}>
            {isLoading ? 'Đang tra cứu...' : 'Tra cứu ngay'}
          </button>
        </div>
      </form>

      {error && <div className='alert'>⚠️ {error}</div>}

      <div className='page-grid page-grid--split'>
        <section className='card'>
          <header className='card-header'>
            <h2 className='card-title'>Thông tin xác thực</h2>
            <p className='card-subtitle'>Kết quả kiểm tra hash từ CertX và blockchain.</p>
          </header>

          {res ? (
            res.status === 'NOT_FOUND' ? (
              <div className='alert'>Không tìm thấy chứng chỉ với hash này.</div>
            ) : (
              <>
                <ul className='meta-list'>
                  {/* Hiển thị StatusBadge nổi bật ở đầu danh sách */}
                  <li className='meta-item' style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '16px', marginBottom: '12px' }}>
                    <span className='meta-label'>Trạng thái</span>
                    <span className='meta-value'>
                      <StatusBadge status={res.status} />
                    </span>
                  </li>
                  {infoList.map((item) => (
                    <li key={item.label} className='meta-item'>
                      <span className='meta-label'>{item.label}</span>
                      <span className='meta-value'>{item.value}</span>
                    </li>
                  ))}
                </ul>

                {res && res.status !== 'NOT_FOUND' && hash && (
                  <div className='field' style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>QR Code xác thực</label>
                    <QRViewer value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify?hash=${hash}`} />
                    <small className='field-hint' style={{ marginTop: '8px', display: 'block' }}>
                      Quét QR code để xác thực chứng chỉ này
                    </small>
                  </div>
                )}
                {file && isAdmin && (
                  <div className='card-footer' style={{ justifyContent: 'flex-start', marginTop: '16px' }}>
                    {res?.metadataUri && (
                      <a className='btn btn-ghost' href={res.metadataUri} target='_blank' rel='noreferrer'>Mở metadata</a>
                    )}
                  </div>
                )}
              </>
            )
          ) : (
            <ul className='history-list'>
              <li>- Hash được lấy từ URL verify hoặc dashboard cấp phát.</li>
              <li>- Người nhận có thể dùng trang này để kiểm tra tính hợp lệ.</li>
              <li>- Hệ thống trả về metadata IPFS và bản có watermark.</li>
            </ul>
          )}
        </section>

        <section className='card'>
          <header className='card-header'>
            <h2 className='card-title'>Xem trước chứng chỉ</h2>
            <p className='card-subtitle'>Bản được hiển thị chỉ là bản xem trước, hãy kiểm tra thông tin trên chứng chỉ để đảm bảo tính hợp lệ.</p>
          </header>
          
          {file ? (
            <>
              {file.mimeType.startsWith('image/') ? (
                <div className='preview-surface' style={{ 
                  minHeight: '300px', 
                  maxHeight: '400px', 
                  overflow: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <img 
                    src={file.url} 
                    alt='Certificate preview' 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '350px', 
                      objectFit: 'contain',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }} 
                  />
                </div>
              ) : (
                <div style={{ 
                  minHeight: '400px',
                  maxHeight: '500px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  <PdfViewer 
                    file={file.blob || file.url} 
                    initialMode="fit"
                    showControls={false}
                  />
                </div>
              )}
              <div className='card-footer' style={{ justifyContent: 'center' }}>
                <button
                  className='btn btn-primary'
                  onClick={() => setShowPreviewModal(true)}
                >
                  Xem chứng chỉ
                </button>
              </div>
            </>
          ) : (
            <div className='preview-surface' style={{ 
              minHeight: '300px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999'
            }}>
              <p>Chưa có file để xem trước.</p>
            </div>
          )}
        </section>

        {/* Modal xem chứng chỉ lớn */}
        {showPreviewModal && file && (
          <div 
            className='modal-overlay' 
            onClick={() => setShowPreviewModal(false)}
            style={{ zIndex: 2000 }}
          >
            <div 
              className='modal' 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                maxWidth: '95vw', 
                width: '1200px',
                height: '90vh',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: 0
              }}
            >
              <div className='modal-header' style={{ flexShrink: 0, padding: '20px 24px' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '4px' }}>Chứng chỉ</h3>
                  {res?.data && (
                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                      {res.data.holderName} • {res.data.degree}
                    </p>
                  )}
                </div>
                <button 
                  className='modal-close-btn' 
                  onClick={() => setShowPreviewModal(false)}
                  style={{ fontSize: '28px' }}
                >
                  ×
                </button>
              </div>
              <div 
                className='modal-body' 
                style={{ 
                  flex: 1,
                  overflow: 'hidden',
                  padding: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f9fafb',
                  minHeight: 0
                }}
              >
                {file.mimeType.startsWith('image/') ? (
                  <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f9fafb'
                  }}>
                    <img 
                      src={file.url} 
                      alt='Certificate' 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        background: '#fff',
                        padding: '8px'
                      }} 
                    />
                  </div>
                ) : (
                  <PdfViewer file={file.blob || file.url} initialMode="fit" />
                )}
              </div>
              <div className='modal-actions' style={{ flexShrink: 0, padding: '16px 24px' }}>
                <button
                  className='btn btn-ghost'
                  onClick={() => setShowPreviewModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
