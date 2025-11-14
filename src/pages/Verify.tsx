import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { verifyHash, CertStatus } from '../api/certs.api'
import StatusBadge from '../components/StatusBadge'
import { getCertIPFSData } from '../api/ipfs.api'
import CertIPFS from '../interfaces/cert.interface'
import { formatDateShort, formatDateRange } from '../utils/format'
import { calculateStatus } from '../utils/status'

type VerifyResult = {
  status: CertStatus | 'NOT_FOUND'
  data: CertIPFS | null
  metadataUri?: string
}

export default function Verify() {
  const [sp] = useSearchParams()
  const [hash, setHash] = useState(sp.get('hash') || '')
  const [res, setRes] = useState<VerifyResult | null>(null)
  const [file, setFile] = useState<{ url: string; mimeType: string } | null>(null)
  const [source, setSource] = useState<'chain' | 'db' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        const url = URL.createObjectURL(blob)
        setFile({ url, mimeType })
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

  const renderPreview = () => {
    if (!file) {
      return <p>Chưa có file để xem trước.</p>
    }

    if (file.mimeType.startsWith('image/')) {
      return <img src={file.url} alt='Certificate preview' />
    }

    return <iframe src={file.url} title='Certificate preview' />
  }

  const infoList = res?.data
    ? [
        { label: 'Họ tên', value: res.data.holderName },
        { label: 'Văn bằng', value: res.data.degree },
        { label: 'Ngày cấp - Ngày hết hạn', value: formatDateRange(res.data.issuedDate, res.data.expirationDate) },
        { label: 'Ngày xác thực', value: formatDateShort(res.data.certxIssuedDate) },
        { label: 'Đơn vị cấp', value: res.data.issuerName },
        { label: 'Hash (đã watermark)', value: res.data.docHash },
        res.data.hashBeforeWatermark
          ? { label: 'Hash (trước watermark)', value: res.data.hashBeforeWatermark }
          : null,
        res.data.watermarkOriginalText
          ? { label: 'Chuỗi watermark gốc', value: res.data.watermarkOriginalText }
          : null,
        typeof res.data.watermarkApplied !== 'undefined'
          ? {
              label: 'Watermark',
              value: `${res.data.watermarkApplied ? 'Đã áp dụng' : 'Chưa áp dụng'} • opacity ${res.data.watermarkOpacity ?? 'N/A'} • màu ${res.data.watermarkColor ?? 'N/A'} • lặp ${res.data.watermarkRepeat ?? 'N/A'} • margin ${res.data.watermarkMargin ?? 'N/A'}`,
            }
          : null,
        res.data.watermarkFontPath
          ? { label: 'Font watermark', value: res.data.watermarkFontPath }
          : null,
        typeof res.data.watermarkUsedCustomFont !== 'undefined'
          ? { label: 'Dùng font tùy chỉnh', value: res.data.watermarkUsedCustomFont ? 'Có' : 'Không' }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>
    : []

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <div className='page-eyebrow'>Verification Portal</div>
          <h1 className='page-title'>Tra cứu chứng chỉ CertX</h1>
          <p className='page-subtitle'>Nhập hash được cấp phát để xác thực trạng thái chứng chỉ và xem bản có watermark.</p>
        </div>
        {res?.status && <StatusBadge status={res.status} />}
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
                {source === 'db' && (
                  <div className='alert alert-warning'>
                    ⚠️ Dữ liệu đang lấy từ bộ nhớ off-chain. Giao dịch on-chain có thể đang chờ xác nhận.
                  </div>
                )}

                <ul className='meta-list'>
                  {infoList.map((item) => (
                    <li key={item.label} className='meta-item'>
                      <span className='meta-label'>{item.label}</span>
                      <span className='meta-value'>{item.value}</span>
                    </li>
                  ))}
                </ul>

                {file && (
                  <div className='card-footer' style={{ justifyContent: 'flex-start' }}>
                    {res.metadataUri && (
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
            <p className='card-subtitle'>Bản được hiển thị đã bao gồm watermark do CertX chèn vào.</p>
          </header>
          <div className='preview-surface'>{renderPreview()}</div>
        </section>
      </div>
    </div>
  )
}
