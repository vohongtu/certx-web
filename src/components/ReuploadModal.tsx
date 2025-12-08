import { useState } from 'react'
import FilePicker from './FilePicker'
import DocumentTypeSelector from './DocumentTypeSelector'
import { CertSummary } from '../api/certs.api'

interface ReuploadModalProps {
  cert: CertSummary
  onClose: () => void
  onReupload: (data: {
    file: File | null
    useOriginalFile: boolean
    note: string
    holderName: string
    degree: string
    credentialTypeId: string | null
  }) => Promise<void>
  isReuploading: boolean
}

export default function ReuploadModal({ cert, onClose, onReupload, isReuploading }: ReuploadModalProps) {
  const [reuploadFile, setReuploadFile] = useState<File | null>(null)
  const [reuploadUseOriginalFile, setReuploadUseOriginalFile] = useState(false)
  const [reuploadNote, setReuploadNote] = useState('')
  const [reuploadHolderName, setReuploadHolderName] = useState(cert.holderName)
  const [reuploadDegree, setReuploadDegree] = useState(cert.degree)
  const [reuploadCredentialTypeId, setReuploadCredentialTypeId] = useState<string | null>(cert.credentialTypeId || null)

  const handleSubmit = async () => {
    if (!reuploadNote.trim() || !reuploadHolderName.trim() || (!reuploadDegree.trim() && !reuploadCredentialTypeId)) {
      alert('Vui lòng điền đầy đủ thông tin')
      return
    }
    if (!reuploadUseOriginalFile && !reuploadFile) {
      alert('Vui lòng chọn file hoặc chọn dùng file cũ')
      return
    }
    await onReupload({
      file: reuploadFile,
      useOriginalFile: reuploadUseOriginalFile,
      note: reuploadNote.trim(),
      holderName: reuploadHolderName,
      degree: reuploadDegree,
      credentialTypeId: reuploadCredentialTypeId
    })
  }

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal' onClick={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <h3>Reup chứng chỉ</h3>
          <button className='modal-close-btn' onClick={onClose} aria-label='Đóng'>×</button>
        </div>
        <div className='modal-body'>
          <p className='text-muted'>Chứng chỉ đã bị từ chối. Vui lòng chọn file và điền thông tin.</p>
          {cert.rejectionReason && (
            <div className='info-box' style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
              <strong>Lý do từ chối:</strong> {cert.rejectionReason}
            </div>
          )}
          
          <div className='field'>
            <label>Chọn file *</label>
            <div className='field' style={{ marginBottom: '12px' }}>
              <label className='checkbox-label'>
                <input 
                  type='checkbox' 
                  checked={reuploadUseOriginalFile} 
                  onChange={(e) => {
                    setReuploadUseOriginalFile(e.target.checked)
                    if (e.target.checked) setReuploadFile(null)
                  }} 
                />
                <span>Dùng file cũ (file đã upload trước đó)</span>
              </label>
              <small className='field-hint'>Nếu chọn, hệ thống sẽ sử dụng file đã upload trước đó</small>
            </div>
            
            {!reuploadUseOriginalFile && (
              <FilePicker onPick={setReuploadFile} file={reuploadFile} onError={(msg) => alert(msg)} />
            )}
            
            {reuploadUseOriginalFile && (
              <div className='info-box' style={{ padding: '12px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px' }}>
                <small className='field-hint'>
                  ✓ Sẽ sử dụng file đã upload trước đó. Ngày cấp sẽ tự động được set bằng ngày upload mới.
                </small>
              </div>
            )}
          </div>
          
          <div className='field' style={{ marginTop: '16px' }}>
            <label>Ghi chú *</label>
            <textarea 
              value={reuploadNote} 
              onChange={(e) => setReuploadNote(e.target.value)} 
              placeholder='Nhập ghi chú về việc reup...' 
              required 
              rows={4}
            />
            <small className='field-hint'>Vui lòng nhập ghi chú trước khi reup</small>
          </div>

          <div className='field'>
            <label>Người nhận *</label>
            <input 
              type='text' 
              value={reuploadHolderName} 
              onChange={(e) => setReuploadHolderName(e.target.value)} 
              placeholder='Tên người nhận' 
              required 
            />
          </div>

          <div className='field'>
            <label>Văn bằng *</label>
            <DocumentTypeSelector
              value={reuploadCredentialTypeId || reuploadDegree}
              onChange={(id, name) => {
                setReuploadCredentialTypeId(id)
                setReuploadDegree(name)
              }}
              placeholder="Chọn loại văn bằng..."
              allowCustom={true}
            />
          </div>

          <div className='info-box' style={{ marginTop: '16px', padding: '12px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px' }}>
            <small className='field-hint'>
              ℹ️ Ngày cấp sẽ tự động được set bằng ngày upload. Admin sẽ quyết định ngày hết hạn khi duyệt chứng chỉ.
            </small>
          </div>
        </div>
        <div className='modal-actions'>
          <button className='btn btn-ghost' onClick={onClose}>Hủy</button>
          <button 
            className='btn btn-primary' 
            onClick={handleSubmit}
            disabled={(!reuploadUseOriginalFile && !reuploadFile) || !reuploadNote.trim() || !reuploadHolderName.trim() || (!reuploadDegree.trim() && !reuploadCredentialTypeId) || isReuploading}
          >
            {isReuploading ? 'Đang reup...' : 'Reup'}
          </button>
        </div>
      </div>
    </div>
  )
}

