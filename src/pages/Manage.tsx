import { useEffect, useState } from 'react'
import { IconShieldCheck, IconCloudUpload } from '@tabler/icons-react'
import StatusBadge from '../components/StatusBadge'
import IconButton from '../components/IconButton'
import { getIconColor } from '../utils/iconColors'
import ReuploadModal from '../components/ReuploadModal'
import FilterBar from '../components/FilterBar'
import PdfViewer from '../components/PdfViewer'
import { CertSummary, CertListResponse, listCerts, CertStatus, reuploadCert, getPreviewBlobUrl } from '../api/certs.api'
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
  const { searchText, appliedSearch, setSearchText } = useSearch()
  const [error, setError] = useState<string | null>(null)
  const [showReuploadModal, setShowReuploadModal] = useState(false)
  const [selectedCertForReup, setSelectedCertForReup] = useState<CertSummary | null>(null)
  const [isReuploading, setIsReuploading] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewCert, setPreviewCert] = useState<CertSummary | null>(null)
  const [previewFile, setPreviewFile] = useState<{ url: string; mimeType: string; blob?: Blob } | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
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
    fetchCerts(1, limit, appliedSearch, status).catch(err => {
      console.error('[Manage] Error fetching certs:', err)
      setError(err.message || 'Không thể tải danh sách chứng chỉ')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch, status, limit])

  useEffect(() => {
    fetchCerts(page, limit, appliedSearch, status).catch(err => {
      console.error('[Manage] Error fetching certs:', err)
      setError(err.message || 'Không thể tải danh sách chứng chỉ')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleStatusChange = (newStatus: 'ALL' | CertStatus) => {
    setStatus(newStatus)
    setPage(1)
    // Clear certs ngay lập tức và fetch với status mới
    setCerts([])
    fetchCerts(1, limit, appliedSearch, newStatus)
  }

  const openReuploadModal = (cert: CertSummary) => {
    setSelectedCertForReup(cert)
    setShowReuploadModal(true)
  }

  // Helper function để check xem đã có cert PENDING nào được tạo từ cert REJECTED này chưa
  const hasPendingReup = (certId: string) => {
    return certs.some(c => c.status === 'PENDING' && c.reuploadedFrom === certId)
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
                  <th style={{ textAlign: 'center' }}>Người nhận</th>
                  <th style={{ textAlign: 'center' }}>Hash</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Ngày cấp - Ngày hết hạn</th>
                  <th style={{ textAlign: 'center' }}>Ngày upload</th>
                  <th style={{ textAlign: 'center' }}>Ghi chú</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((cert) => (
                  <tr key={cert.id}>
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                      <div className='table-primary' style={{ fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>{cert.holderName}</div>
                      <div className='table-secondary' style={{ fontSize: '11px', color: '#6b7280' }}>{cert.degree}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                      <div className='hash-cell' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span className='hash-text' title={cert.docHash} style={{ fontSize: '11px', fontFamily: 'monospace', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncateHash(cert.docHash, 6, 4)}</span>
                        <button 
                          className='hash-copy-btn' 
                          onClick={(e) => copyToClipboard(cert.docHash, e.currentTarget)}
                          title='Copy hash'
                          aria-label='Copy hash'
                          style={{ fontSize: '12px', padding: '2px 4px', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px' }}><StatusBadge status={cert.status} /></td>
                    <td className='date-cell' style={{ textAlign: 'center', padding: '8px', fontSize: '12px' }}>{formatDateRange(cert.issuedDate, cert.expirationDate)}</td>
                    <td className='date-cell' style={{ textAlign: 'center', padding: '8px', fontSize: '12px' }}>{formatDateShort(cert.certxIssuedDate)}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                        {cert.rejectionReason && (
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px'
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
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px'
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
                          <span style={{ color: '#999', fontSize: '12px' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                      <div className='table-actions' style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {cert.status === 'VALID' && (
                          <IconButton
                            icon={<IconShieldCheck size={16} />}
                            label='Verify'
                            iconColor={getIconColor('verify')}
                            href={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify?hash=${cert.docHash}`}
                            target='_blank'
                            rel='noreferrer'
                            variant='ghost'
                          />
                        )}
                        {cert.status === 'REJECTED' && cert.allowReupload && !hasPendingReup(cert.id) && (
                            <IconButton
                            icon={<IconCloudUpload size={16} />}
                              label='Gửi lại'
                              iconColor={getIconColor('reupload')}
                              onClick={() => openReuploadModal(cert)}
                              disabled={isReuploading}
                              variant='outline'
                            />
                        )}
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
                      // Fetch blob để lấy mimeType
                      const response = await fetch(blobUrl)
                      const blob = await response.blob()
                      const mimeType = blob.type || 'application/pdf'
                      const url = URL.createObjectURL(blob)
                      setPreviewFile({ 
                        url, 
                        mimeType, 
                        blob: mimeType.startsWith('image/') ? undefined : blob 
                      })
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
                  <a className='btn btn-ghost' href={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify?hash=${cert.docHash}`} target='_blank' rel='noreferrer'>
                    Xem verify
                  </a>
                )}
                {cert.status === 'REJECTED' && cert.allowReupload && !hasPendingReup(cert.id) && (
                    <button
                      className='btn btn-primary'
                      onClick={() => openReuploadModal(cert)}
                      disabled={isReuploading}
                    >
                      Reup
                    </button>
                )}
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
        <ReuploadModal
          cert={selectedCertForReup}
          onClose={() => {
            setShowReuploadModal(false)
            setSelectedCertForReup(null)
          }}
          onReupload={handleReupload}
          isReuploading={isReuploading}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewCert && (
        <div 
          className='modal-overlay' 
          onClick={() => {
            if (previewFile) URL.revokeObjectURL(previewFile.url)
          setShowPreviewModal(false)
          setPreviewCert(null)
            setPreviewFile(null)
          setPreviewError(null)
            setZoomLevel(1)
          }}
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
                <h3 style={{ margin: 0, marginBottom: '4px' }}>Xem trước file chứng chỉ</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  {previewCert.holderName} • {previewCert.degree}
                </p>
              </div>
              <button 
                className='modal-close-btn' 
                onClick={() => {
                  if (previewFile) URL.revokeObjectURL(previewFile.url)
                setShowPreviewModal(false)
                setPreviewCert(null)
                  setPreviewFile(null)
                setPreviewError(null)
                  setZoomLevel(1)
                }}
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
              {previewError ? (
                <div className='alert' style={{ margin: '16px' }}>⚠️ {previewError}</div>
              ) : previewFile ? (
                <>
                  {previewFile.mimeType.startsWith('image/') ? (
                    <div style={{
                      flex: 1,
                      overflow: 'auto',
                      padding: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f9fafb',
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.2s'
                    }}>
                      <img 
                        src={previewFile.url} 
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
                    <div style={{ 
                      flex: 1, 
                      overflow: 'hidden',
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top left',
                      transition: 'transform 0.2s',
                      width: `${100 / zoomLevel}%`,
                      height: `${100 / zoomLevel}%`
                    }}>
                      <PdfViewer 
                        file={previewFile.blob || previewFile.url} 
                        initialMode="fit" 
                        showControls={false}
                  />
                </div>
                  )}
                  {/* Zoom controls */}
                  <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    right: '24px',
                    display: 'flex',
                    gap: '8px',
                    background: 'white',
                    padding: '8px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    zIndex: 10
                  }}>
                    <button
                      className='btn btn-ghost'
                      onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))}
                      style={{ padding: '8px 12px', fontSize: '18px', minWidth: '40px' }}
                      title="Thu nhỏ"
                    >
                      −
                    </button>
                    <span style={{ 
                      fontSize: '14px', 
                      color: '#666', 
                      minWidth: '60px', 
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      className='btn btn-ghost'
                      onClick={() => setZoomLevel(z => Math.min(2, z + 0.1))}
                      style={{ padding: '8px 12px', fontSize: '18px', minWidth: '40px' }}
                      title="Phóng to"
                    >
                      +
                    </button>
                    <button
                      className='btn btn-ghost'
                      onClick={() => setZoomLevel(1)}
                      style={{ padding: '8px 12px', fontSize: '12px', marginLeft: '4px' }}
                      title="Reset zoom"
                    >
                      Reset
                    </button>
                  </div>
                </>
              ) : (
                <div className='loading-state' style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  Đang tải file...
                </div>
              )}
            </div>
            <div className='modal-actions' style={{ flexShrink: 0, padding: '16px 24px' }}>
              <button
                className='btn btn-ghost'
                onClick={() => {
                  if (previewFile) URL.revokeObjectURL(previewFile.url)
                setShowPreviewModal(false)
                setPreviewCert(null)
                  setPreviewFile(null)
                setPreviewError(null)
                  setZoomLevel(1)
                }}
              >
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
