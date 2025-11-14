import { ChangeEvent, useEffect, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import IconButton from '../components/IconButton'
import ReuploadModal from '../components/ReuploadModal'
import FilterBar from '../components/FilterBar'
import { CertSummary, CertListResponse, listCerts, revokeCert, CertStatus, reuploadCert, getPreviewBlobUrl } from '../api/certs.api'
import { formatDateShort, formatDateRange } from '../utils/format'
import { truncateHash, copyToClipboard, getPageNumbers } from '../utils/common'
import { usePagination } from '../hooks/usePagination'
import { useSearch } from '../hooks/useSearch'

const DEFAULT_PAGE_LIMIT = 10

export default function Manage() {
  const [certs, setCerts] = useState<CertSummary[]>([])
  const [status, setStatus] = useState<'ALL' | CertStatus>('ALL')
  const [isLoading, setIsLoading] = useState(false)
  
  const { pagination, page, limit, setPage, setLimit, updatePagination } = usePagination({ defaultLimit: DEFAULT_PAGE_LIMIT })
  const { searchText, appliedSearch, setSearchText, reset: resetSearch } = useSearch()
  const [error, setError] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [showReuploadModal, setShowReuploadModal] = useState(false)
  const [selectedCertForReup, setSelectedCertForReup] = useState<CertSummary | null>(null)
  const [isReuploading, setIsReuploading] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewCert, setPreviewCert] = useState<CertSummary | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteContent, setNoteContent] = useState<{ type: 'rejection' | 'reupload' | 'both'; rejectionReason?: string; reuploadNote?: string } | null>(null)

  const fetchCerts = async (targetPage?: number, targetLimit?: number, search?: string, targetStatus?: 'ALL' | CertStatus) => {
    const requestedPage = targetPage ?? page
    const requestedLimit = targetLimit ?? limit
    const requestedSearch = search !== undefined ? search : appliedSearch
    const requestedStatus = targetStatus !== undefined ? targetStatus : status
    
    // Clear certs ngay lập tức khi filter thay đổi
    setCerts([])
    setIsLoading(true)
    setError(null)
    
    try {
      const response: CertListResponse = await listCerts({
        page: requestedPage,
        limit: requestedLimit,
        q: requestedSearch || undefined,
        status: requestedStatus,
      })
      setCerts(response.items)
      updatePagination(response.pagination)
      if (response.pagination.page !== requestedPage) {
        setPage(response.pagination.page)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Không thể tải danh sách chứng chỉ')
      setCerts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    fetchCerts(1, limit, appliedSearch, status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch, status, limit])

  useEffect(() => {
    fetchCerts(page, limit, appliedSearch, status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newStatus = event.target.value as 'ALL' | CertStatus
    setStatus(newStatus)
    setPage(1)
    // Clear certs ngay lập tức và fetch với status mới
    setCerts([])
    fetchCerts(1, limit, appliedSearch, newStatus)
  }

  const handleLimitChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(event.target.value, 10)
    setLimit(newLimit)
    setPage(1)
  }


  const handleRevoke = async (hash: string) => {
    if (isRevoking) return
    if (!confirm('Thu hồi chứng chỉ này?')) return
    setIsRevoking(hash)
    try {
      await revokeCert(hash)
      await fetchCerts(page, limit, appliedSearch, status)
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Thu hồi thất bại')
    } finally {
      setIsRevoking(null)
    }
  }

  const openReuploadModal = (cert: CertSummary) => {
    setSelectedCertForReup(cert)
    setShowReuploadModal(true)
  }

  const handleReupload = async (data: {
    file: File | null
    useOriginalFile: boolean
    note: string
    holderName: string
    degree: string
    credentialTypeId: string | null
  }) => {
    if (!selectedCertForReup) return

    setIsReuploading(true)
    try {
      const form = new FormData()
      if (!data.useOriginalFile && data.file) {
        form.append('file', data.file)
      }
      form.append('holderName', data.holderName)
      form.append('degree', data.degree)
      if (data.credentialTypeId) {
        form.append('credentialTypeId', data.credentialTypeId)
      }
      form.append('note', data.note)
      form.append('useOriginalFile', data.useOriginalFile ? 'true' : 'false')

      await reuploadCert(selectedCertForReup.id, form)
      
      setShowReuploadModal(false)
      setSelectedCertForReup(null)
      await fetchCerts(page, limit, appliedSearch, status)
      alert('Reup thành công! Vui lòng chờ admin duyệt.')
    } catch (err: any) {
      alert(err?.message || 'Reup thất bại')
    } finally {
      setIsReuploading(false)
    }
  }

  const renderBody = () => {
    if (isLoading) return <div className='loading-state'>Đang tải danh sách file...</div>
    if (error) return <div className='alert'>⚠️ {error}</div>
    if (!certs.length) return <div className='empty-state'>Chưa có file nào được upload.</div>

    return (
      <>
        {/* Desktop Table View */}
        <div className='certs-table-view'>
          <div className='table-wrapper'>
            <table className='data-table'>
              <thead>
                <tr>
                  <th>Người nhận</th>
                  <th>Hash</th>
                  <th>Trạng thái</th>
                  <th>Ngày cấp - Ngày hết hạn</th>
                  <th>Ngày upload</th>
                  <th>Ghi chú</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((cert) => (
                  <tr key={cert.id}>
                    <td>
                      <div className='table-primary'>{cert.holderName}</div>
                      <div className='table-secondary'>{cert.degree}</div>
                    </td>
                    <td>
                      <div className='hash-cell'>
                        <span className='hash-text' title={cert.docHash} style={{ fontSize: '0.8rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncateHash(cert.docHash, 6, 4)}</span>
                        <button 
                          className='hash-copy-btn' 
                          onClick={(e) => copyToClipboard(cert.docHash, e.currentTarget)}
                          title='Copy hash'
                          aria-label='Copy hash'
                          style={{ fontSize: '14px', padding: '2px 6px' }}
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td><StatusBadge status={cert.status} /></td>
                    <td className='date-cell'>{formatDateRange(cert.issuedDate, cert.expirationDate)}</td>
                    <td className='date-cell'>{formatDateShort(cert.certxIssuedDate)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                        {cert.rejectionReason && (
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px'
                            }}
                            onClick={() => {
                              setNoteContent({
                                type: cert.reuploadNote ? 'both' : 'rejection',
                                rejectionReason: cert.rejectionReason,
                                reuploadNote: cert.reuploadNote
                              })
                              setShowNoteModal(true)
                            }}
                            title="Lý do từ chối"
                          >
                            ⚠️
                          </button>
                        )}
                        {cert.reuploadNote && !cert.rejectionReason && (
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px'
                            }}
                            onClick={() => {
                              setNoteContent({
                                type: 'reupload',
                                reuploadNote: cert.reuploadNote
                              })
                              setShowNoteModal(true)
                            }}
                            title="Ghi chú reup"
                          >
                            📝
                          </button>
                        )}
                        {!cert.rejectionReason && !cert.reuploadNote && (
                          <span style={{ color: '#999', fontSize: '14px' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className='table-actions' style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {cert.status === 'VALID' && (
                          <IconButton
                            icon='✓'
                            label='Verify'
                            href={`${window.location.origin}/verify?hash=${cert.docHash}`}
                            target='_blank'
                            rel='noreferrer'
                            variant='ghost'
                          />
                        )}
                        {cert.metadataUri && (
                          <IconButton
                            icon='📋'
                            label='Metadata'
                            href={cert.metadataUri}
                            target='_blank'
                            rel='noreferrer'
                            variant='ghost'
                          />
                        )}
                        {cert.status === 'VALID' && (
                          <IconButton
                            icon='🗑️'
                            label={isRevoking === cert.docHash ? 'Đang thu hồi...' : 'Thu hồi'}
                            onClick={() => handleRevoke(cert.docHash)}
                            disabled={Boolean(isRevoking)}
                            variant='outline'
                          />
                        )}
                        {cert.status === 'REJECTED' && cert.allowReupload && (() => {
                          // Kiểm tra xem đã có cert PENDING nào được tạo từ cert REJECTED này chưa
                          const hasPendingReup = certs.some(c => 
                            c.status === 'PENDING' && 
                            c.reuploadedFrom === cert.id
                          )
                          // Nếu đã có cert PENDING được tạo từ cert này, không hiển thị nút Reup
                          if (hasPendingReup) return null
                          
                          return (
                            <IconButton
                              icon='🔄'
                              label='Reup'
                              onClick={() => openReuploadModal(cert)}
                              disabled={isReuploading}
                              variant='primary'
                            />
                          )
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className='certs-card-view'>
          {certs.map((cert) => (
            <div key={cert.id} className='cert-card'>
              <div className='cert-card-header'>
                <div className='cert-card-title'>
                  <h3 className='cert-holder-name'>{cert.holderName}</h3>
                  <p className='cert-degree'>{cert.degree}</p>
                </div>
                <StatusBadge status={cert.status} />
              </div>

              <div className='cert-card-body'>
                <div className='cert-info-row'>
                  <span className='cert-label'>Hash:</span>
                  <div className='hash-cell'>
                    <span className='hash-text' style={{ fontSize: '0.75rem' }}>{truncateHash(cert.docHash, 4, 3)}</span>
                    <button 
                      className='hash-copy-btn' 
                      onClick={(e) => copyToClipboard(cert.docHash, e.currentTarget)}
                      title='Copy hash'
                      aria-label='Copy hash'
                      style={{ fontSize: '12px', padding: '2px 4px' }}
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div className='cert-info-row'>
                  <span className='cert-label'>Ngày cấp - Ngày hết hạn:</span>
                  <span className='cert-value'>{formatDateRange(cert.issuedDate, cert.expirationDate)}</span>
                </div>

                <div className='cert-info-row'>
                  <span className='cert-label'>Ngày xác thực:</span>
                  <span className='cert-value'>{formatDateShort(cert.certxIssuedDate)}</span>
                </div>

                {(cert.rejectionReason || cert.reuploadNote) && (
                  <div className='cert-info-row'>
                    <span className='cert-label'>Ghi chú:</span>
                    <span className='cert-value'>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {cert.rejectionReason && (
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px'
                            }}
                            onClick={() => {
                              setNoteContent({
                                type: cert.reuploadNote ? 'both' : 'rejection',
                                rejectionReason: cert.rejectionReason,
                                reuploadNote: cert.reuploadNote
                              })
                              setShowNoteModal(true)
                            }}
                            title="Lý do từ chối"
                          >
                            ⚠️
                          </button>
                        )}
                        {cert.reuploadNote && !cert.rejectionReason && (
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px'
                            }}
                            onClick={() => {
                              setNoteContent({
                                type: 'reupload',
                                reuploadNote: cert.reuploadNote
                              })
                              setShowNoteModal(true)
                            }}
                            title="Ghi chú reup"
                          >
                            📝
                          </button>
                        )}
                      </div>
                    </span>
                  </div>
                )}
              </div>

              <div className='cert-card-actions'>
                {/* Xem trước file */}
                <button 
                  className='btn btn-ghost' 
                  onClick={async () => {
                    setPreviewCert(cert)
                    setPreviewError(null)
                    setIsLoadingPreview(true)
                    try {
                      const blobUrl = await getPreviewBlobUrl(cert.id)
                      setPreviewUrl(blobUrl)
                      setShowPreviewModal(true)
                    } catch (err: any) {
                      setPreviewError(err.message || 'Không thể tải file để xem trước')
                    } finally {
                      setIsLoadingPreview(false)
                    }
                  }}
                  disabled={isLoadingPreview}
                >
                  {isLoadingPreview ? 'Đang tải...' : 'Xem trước'}
                </button>
                {cert.status === 'VALID' && (
                  <a className='btn btn-ghost' href={`${window.location.origin}/verify?hash=${cert.docHash}`} target='_blank' rel='noreferrer'>
                    Xem verify
                  </a>
                )}
                {cert.metadataUri && (
                  <a className='btn btn-ghost' href={cert.metadataUri} target='_blank' rel='noreferrer'>
                    Metadata
                  </a>
                )}
                {cert.status === 'VALID' && (
                  <button
                    className='btn btn-outline'
                    onClick={() => handleRevoke(cert.docHash)}
                    disabled={Boolean(isRevoking)}
                  >
                    {isRevoking === cert.docHash ? 'Đang thu hồi...' : 'Thu hồi'}
                  </button>
                )}
                {cert.status === 'REJECTED' && cert.allowReupload && (() => {
                  // Kiểm tra xem đã có cert PENDING nào được tạo từ cert REJECTED này chưa
                  const hasPendingReup = certs.some(c => 
                    c.status === 'PENDING' && 
                    c.reuploadedFrom === cert.id
                  )
                  // Nếu đã có cert PENDING được tạo từ cert này, không hiển thị nút Reup
                  if (hasPendingReup) return null
                  
                  return (
                    <button
                      className='btn btn-primary'
                      onClick={() => openReuploadModal(cert)}
                      disabled={isReuploading}
                    >
                      Reup
                    </button>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className='pagination' style={{ marginTop: '16px', padding: '12px', fontSize: '14px' }}>
            <span className='pagination-info' style={{ fontSize: '13px', color: '#64748b' }}>
              Trang {pagination.page} / {pagination.totalPages} (Tổng: {pagination.total})
            </span>
            <div className='pagination-actions' style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                className='btn btn-ghost' 
                onClick={() => {
                  const newPage = Math.max(pagination.page - 1, 1)
                  setPage(newPage)
                }} 
                disabled={pagination.page <= 1 || isLoading}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                ‹ Trước
              </button>
              <div className='pagination-numbers' style={{ display: 'flex', gap: '4px' }}>
                {getPageNumbers(pagination.page, pagination.totalPages).map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return <span key={`ellipsis-${idx}`} className='pagination-ellipsis' style={{ padding: '6px 8px' }}>...</span>
                  }
                  const pageNumValue = pageNum as number
                  return (
                    <button
                      key={pageNumValue}
                      className={`btn ${pageNumValue === pagination.page ? 'btn-primary' : 'btn-ghost'} pagination-number`}
                      onClick={() => setPage(pageNumValue)}
                      disabled={isLoading}
                      style={{ padding: '6px 10px', fontSize: '13px', minWidth: '36px' }}
                    >
                      {pageNumValue}
                    </button>
                  )
                })}
              </div>
              <button 
                className='btn btn-ghost' 
                onClick={() => {
                  const newPage = Math.min(pagination.page + 1, pagination.totalPages)
                  setPage(newPage)
                }} 
                disabled={pagination.page >= pagination.totalPages || isLoading}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Sau ›
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <div className='page-eyebrow'>User Dashboard</div>
          <h1 className='page-title'>Lịch sử upload</h1>
          <p className='page-subtitle'>Theo dõi toàn bộ file đã upload và trạng thái duyệt.</p>
        </div>
        <button className='btn btn-ghost' onClick={() => fetchCerts(page, limit, appliedSearch, status)} disabled={isLoading}>Làm mới</button>
      </div>

      <section className='card'>
        <header className='card-header'>
          <h2 className='card-title'>Danh sách file đã upload</h2>
          <p className='card-subtitle'>Bao gồm thông tin hash, trạng thái duyệt và đường dẫn verify/metadata.</p>
        </header>
        <FilterBar
          searchText={searchText}
          onSearchChange={(value) => {
            setSearchText(value)
            setPage(1)
          }}
          status={status}
          onStatusChange={handleStatusChange}
          limit={limit}
          onLimitChange={(newLimit) => {
            setLimit(newLimit)
            setPage(1)
          }}
          onClearCerts={() => setCerts([])}
        />
        {renderBody()}
      </section>

      {/* Reupload Modal */}
      {showReuploadModal && selectedCertForReup && (
        <div className='modal-overlay' onClick={() => {
          setShowReuploadModal(false)
          setSelectedCertForReup(null)
          setReuploadFile(null)
          setReuploadNote('')
          setReuploadHolderName('')
          setReuploadDegree('')
          setReuploadCredentialTypeId(null)
          setReuploadUseOriginalFile(false)
        }}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>Reup chứng chỉ</h3>
              <button className='modal-close-btn' onClick={() => {
                setShowReuploadModal(false)
                setSelectedCertForReup(null)
                setReuploadFile(null)
                setReuploadNote('')
                setReuploadHolderName('')
                setReuploadDegree('')
                setReuploadCredentialTypeId(null)
                setReuploadUseOriginalFile(false)
              }} aria-label='Đóng'>×</button>
            </div>
            <div className='modal-body'>
              <p className='text-muted'>Chứng chỉ đã bị từ chối. Vui lòng chọn file và điền thông tin.</p>
              {selectedCertForReup.rejectionReason && (
                <div className='info-box' style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                  <strong>Lý do từ chối:</strong> {selectedCertForReup.rejectionReason}
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
                        if (e.target.checked) {
                          setReuploadFile(null)
                        }
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
              <button className='btn btn-ghost' onClick={() => {
                setShowReuploadModal(false)
                setSelectedCertForReup(null)
                setReuploadFile(null)
                setReuploadNote('')
                setReuploadHolderName('')
                setReuploadDegree('')
                setReuploadUseOriginalFile(false)
              }}>Hủy</button>
              <button 
                className='btn btn-primary' 
                onClick={handleReupload}
                disabled={(!reuploadUseOriginalFile && !reuploadFile) || !reuploadNote.trim() || !reuploadHolderName.trim() || (!reuploadDegree.trim() && !reuploadCredentialTypeId) || isReuploading}
              >
                {isReuploading ? 'Đang reup...' : 'Reup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewCert && (
        <div className='modal-overlay' onClick={() => {
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          setShowPreviewModal(false)
          setPreviewCert(null)
          setPreviewUrl(null)
          setPreviewError(null)
        }}>
          <div className='modal' style={{ maxWidth: '90vw', maxHeight: '90vh', width: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>Xem trước file chứng chỉ</h3>
              <button className='modal-close-btn' onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl)
                setShowPreviewModal(false)
                setPreviewCert(null)
                setPreviewUrl(null)
                setPreviewError(null)
              }}>×</button>
            </div>
            <div className='modal-body' style={{ padding: '16px', overflow: 'auto' }}>
              <div style={{ marginBottom: '16px' }}>
                <p><strong>Người nhận:</strong> {previewCert.holderName}</p>
                <p><strong>Văn bằng:</strong> {previewCert.degree}</p>
                <p><strong>Trạng thái:</strong> <StatusBadge status={previewCert.status} /></p>
              </div>
              {previewError ? (
                <div className='alert'>⚠️ {previewError}</div>
              ) : previewUrl ? (
                <div className='preview-surface' style={{ border: '1px solid #ddd', borderRadius: '4px', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <iframe 
                    src={previewUrl} 
                    title='Certificate preview' 
                    style={{ width: '100%', height: '600px', border: 'none' }}
                  />
                </div>
              ) : (
                <div className='loading-state'>Đang tải file...</div>
              )}
            </div>
            <div className='modal-actions'>
              <button className='btn btn-ghost' onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl)
                setShowPreviewModal(false)
                setPreviewCert(null)
                setPreviewUrl(null)
                setPreviewError(null)
              }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && noteContent && (
        <div className='modal-overlay' onClick={() => { setShowNoteModal(false); setNoteContent(null) }}>
          <div className='modal' style={{ maxWidth: '500px', width: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>
                {noteContent.type === 'rejection' && '⚠️ Lý do từ chối'}
                {noteContent.type === 'reupload' && '📝 Ghi chú reup'}
                {noteContent.type === 'both' && '⚠️ Lý do từ chối & 📝 Ghi chú reup'}
              </h3>
              <button className='modal-close-btn' onClick={() => { setShowNoteModal(false); setNoteContent(null) }}>×</button>
            </div>
            <div className='modal-body' style={{ padding: '16px' }}>
              {noteContent.rejectionReason && (
                <div style={{ marginBottom: noteContent.reuploadNote ? '16px' : '0' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#dc2626' }}>Lý do từ chối:</div>
                  <div style={{ 
                    padding: '12px', 
                    background: '#fef2f2', 
                    borderRadius: '4px', 
                    border: '1px solid #fecaca',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {noteContent.rejectionReason}
                  </div>
                </div>
              )}
              {noteContent.reuploadNote && (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#2563eb' }}>Ghi chú reup:</div>
                  <div style={{ 
                    padding: '12px', 
                    background: '#eff6ff', 
                    borderRadius: '4px', 
                    border: '1px solid #bfdbfe',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {noteContent.reuploadNote}
                  </div>
                </div>
              )}
            </div>
            <div className='modal-actions'>
              <button className='btn btn-ghost' onClick={() => { setShowNoteModal(false); setNoteContent(null) }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
