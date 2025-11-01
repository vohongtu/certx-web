import { useState } from 'react'
import { issueCert, revokeCert } from '../api/certs.api'
import FilePicker from '../components/FilePicker'
import QRViewer from '../components/QRViewer'

export default function Issue() {
  const [file, setFile] = useState<File | null>(null)
  const [holderName, setHolderName] = useState('')
  const [degree, setDegree] = useState('')
  const [issuedDate, setIssuedDate] = useState('')
  const [result, setResult] = useState<{ hash: string; verifyUrl: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doIssue = async () => {
    if (!file) return

    // Kiểm tra kích thước file (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File quá lớn. Kích thước tối đa là 5MB. File của bạn: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('holderName', holderName)
      fd.append('degree', degree)
      fd.append('issuedDate', issuedDate)

      const res = await issueCert(fd)
      setResult({ hash: res.hash, verifyUrl: res.verifyUrl })
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi cấp phát chứng chỉ')
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
      alert('Đã thu hồi chứng chỉ!')
      setResult(null)
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi thu hồi chứng chỉ')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <div className='page-eyebrow'>Issuer Console</div>
          <h1 className='page-title'>Cấp phát chứng chỉ mới</h1>
          <p className='page-subtitle'>Upload file chứng chỉ, hệ thống sẽ chèn watermark, tính hash và ghi nhận lên blockchain.</p>
        </div>
        {result && <span className='badge-soft'>Hash mới đã tạo</span>}
      </div>

      <div className='page-grid page-grid--split'>
        <section className='card'>
          <header className='card-header'>
            <h2 className='card-title'>Thông tin chứng chỉ</h2>
            <p className='card-subtitle'>Điền các trường bắt buộc rồi tải lên file PDF/ảnh của chứng chỉ.</p>
          </header>

          <FilePicker onPick={setFile} file={file} onError={setError} />

          <div className='form-grid'>
            <div className='field'>
              <label>Họ tên người nhận</label>
              <input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder='Nguyễn Văn A' />
            </div>
            <div className='field'>
              <label>Văn bằng</label>
              <input value={degree} onChange={(e) => setDegree(e.target.value)} placeholder='Bachelor of Science' />
            </div>
            <div className='field'>
              <label>Ngày cấp</label>
              <input type='date' value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
            </div>
          </div>

          <div className='card-footer'>
            <button className='btn btn-primary' onClick={doIssue} disabled={!file || !holderName || !degree || !issuedDate || isLoading}>
              {isLoading ? 'Đang xử lý...' : 'Cấp phát chứng chỉ'}
            </button>
          </div>
        </section>

        <section className='card'>
          <header className='card-header'>
            <h2 className='card-title'>Kết quả & hướng dẫn</h2>
            <p className='card-subtitle'>Theo dõi hash và trạng thái để chia sẻ cho người nhận.</p>
          </header>

          {error && <div className='alert'>⚠️ {error}</div>}

          {result ? (
            <>
              <div className='field'>
                <label>Hash đã ghi nhận</label>
                <div className='hash-pill'>{result.hash}</div>
              </div>

              <ul className='history-list'>
                <li>- Hash được tính từ file đã watermark.</li>
                <li>- Chia sẻ link verify để người nhận kiểm tra tức thời.</li>
                <li>- Dùng chức năng thu hồi nếu phát hiện sai sót.</li>
              </ul>

              <QRViewer value={result.verifyUrl} />

              <div className='card-footer'>
                <a href={result.verifyUrl} target='_blank' rel='noreferrer' className='btn btn-outline'>Mở trang verify</a>
                <button className='btn btn-ghost' onClick={doRevoke} disabled={isLoading}>
                  {isLoading ? 'Đang xử lý...' : 'Thu hồi chứng chỉ'}
                </button>
              </div>
            </>
          ) : (
            <ul className='history-list'>
              <li>- Bước 1: Chọn file chứng chỉ (PDF, JPG, PNG).</li>
              <li>- Bước 2: Nhập thông tin người nhận và ngày cấp.</li>
              <li>- Bước 3: Kiểm tra hash và chia sẻ đường dẫn verify.</li>
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
