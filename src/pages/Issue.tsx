import { useState } from 'react'
import { uploadFile } from '../api/certs.api'
import FilePicker from '../components/FilePicker'
import DocumentTypeSelector from '../components/DocumentTypeSelector'

export default function Issue() {
  const [file, setFile] = useState<File | null>(null)
  const [holderName, setHolderName] = useState('')
  const [degree, setDegree] = useState('')
  const [credentialTypeId, setCredentialTypeId] = useState<string | null>(null)
  const [result, setResult] = useState<{ id: string; docHash: string; status: string; message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doUpload = async () => {
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
      if (credentialTypeId) {
        fd.append('credentialTypeId', credentialTypeId)
      }
      // Không gửi issuedDate - backend sẽ tự động set = ngày upload

      const res = await uploadFile(fd)
      setResult(res)
      // Reset form sau khi upload thành công
      setFile(null)
      setHolderName('')
      setDegree('')
      setCredentialTypeId(null)
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi upload file')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <div className='page-eyebrow'>User Console</div>
          <h1 className='page-title'>Upload file chứng chỉ</h1>
          <p className='page-subtitle'>Upload file chứng chỉ để admin duyệt và cấp phát. File sẽ được xử lý và chờ duyệt.</p>
        </div>
        {result && <span className='badge-soft'>Đã upload thành công</span>}
      </div>

      <div className='page-grid page-grid--split'>
        <section className='card'>
          <header className='card-header'>
            <h2 className='card-title'>Thông tin chứng chỉ</h2>
            <p className='card-subtitle'>Điền các trường bắt buộc rồi tải lên file PDF/ảnh của chứng chỉ. File sẽ chờ admin duyệt.</p>
          </header>

          <FilePicker onPick={setFile} file={file} onError={setError} />

          <div className='form-grid' style={{ gap: '12px' }}>
            <div className='field' style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '14px', marginBottom: '6px' }}>Họ tên người nhận</label>
              <input 
                value={holderName} 
                onChange={(e) => setHolderName(e.target.value)} 
                placeholder='Nguyễn Văn A'
                style={{ padding: '8px 12px', fontSize: '14px' }}
              />
            </div>
            <div className='field' style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '14px', marginBottom: '6px' }}>Văn bằng</label>
              <DocumentTypeSelector
                value={credentialTypeId || degree}
                onChange={(id, name) => {
                  setCredentialTypeId(id)
                  setDegree(name)
                }}
                placeholder="Chọn loại văn bằng..."
                allowCustom={true}
              />
            </div>
          </div>
          
          <div className='info-box' style={{ marginTop: '16px', padding: '12px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px' }}>
            <small className='field-hint'>
              ℹ️ Admin sẽ mất khoản 2 đến 3 giờ để hoàn thành cấp phát chứng chỉ. Vui lòng chờ để nhận được chứng chỉ.
            </small>
          </div>

          <div className='card-footer'>
            <button 
              className='btn btn-primary' 
              onClick={doUpload} 
              disabled={!file || !holderName || !degree || isLoading}
            >
              {isLoading ? 'Đang upload...' : 'Upload file'}
            </button>
          </div>
        </section>

        <section className='card'>
          <header className='card-header'>
            <h2 className='card-title'>Kết quả & hướng dẫn</h2>
            <p className='card-subtitle'>Theo dõi trạng thái upload và chờ admin duyệt.</p>
          </header>

          {error && <div className='alert'>⚠️ {error}</div>}

          {result ? (
            <>
              <div className='alert alert-success'>
                ✅ {result.message}
              </div>
              <div className='field'>
                <label>Hash</label>
                <div className='hash-pill'>{result.docHash}</div>
              </div>
              <div className='field'>
                <label>Trạng thái</label>
                <div className='badge-soft'>{result.status === 'PENDING' ? 'Chờ duyệt' : result.status}</div>
              </div>

              <ul className='history-list'>
                <li>- File đã được upload thành công.</li>
                <li>- File đang chờ admin duyệt và cấp phát.</li>
                <li>- Bạn có thể xem lịch sử upload trong mục "Quản lý".</li>
              </ul>
            </>
          ) : (
            <ul className='history-list'>
              <li>- Bước 1: Chọn file chứng chỉ (PDF, JPG, PNG).</li>
              <li>- Bước 2: Nhập thông tin người nhận và văn bằng.</li>
              <li>- Bước 3: Upload file và chờ admin duyệt.</li>
              <li>- Bước 4: Nhận chứng chỉ sau khi admin duyệt.</li>
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
