import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import { CertSummary, CertListResponse, listCerts, revokeCert } from '../api/certs.api'

const PAGE_LIMIT = 5

const formatDateShort = (value?: string) => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return value
  }
}

const truncateHash = (hash: string, start = 8, end = 6) => {
  if (hash.length <= start + end) return hash
  return `${hash.slice(0, start)}...${hash.slice(-end)}`
}

const copyToClipboard = (text: string, button: HTMLButtonElement) => {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent
    button.textContent = '✓'
    button.style.opacity = '1'
    setTimeout(() => {
      button.textContent = originalText
      button.style.opacity = ''
    }, 1500)
  }).catch(() => {
    // Fallback if clipboard API fails
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    
    const originalText = button.textContent
    button.textContent = '✓'
    button.style.opacity = '1'
    setTimeout(() => {
      button.textContent = originalText
      button.style.opacity = ''
    }, 1500)
  })
}

export default function Manage() {
  const [certs, setCerts] = useState<CertSummary[]>([])
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number }>({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 })
  const [searchText, setSearchText] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState<'ALL' | 'VALID' | 'REVOKED'>('ALL')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)

  const fetchCerts = async (targetPage?: number) => {
    const requestedPage = targetPage ?? page
    setIsLoading(true)
    setError(null)
    try {
      const response: CertListResponse = await listCerts({
        page: requestedPage,
        limit: PAGE_LIMIT,
        q: appliedSearch || undefined,
        status,
      })
      setCerts(response.items)
      setPagination(response.pagination)
      if (response.pagination.page !== requestedPage) {
        setPage(response.pagination.page)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Không thể tải danh sách chứng chỉ')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCerts(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedSearch, status])

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    setAppliedSearch(searchText.trim())
    setPage(1)
  }

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setStatus(event.target.value as 'ALL' | 'VALID' | 'REVOKED')
    setPage(1)
  }

  const handleResetFilters = () => {
    setSearchText('')
    setAppliedSearch('')
    setStatus('ALL')
    setPage(1)
  }

  const getPageNumbers = () => {
    const { page: current, totalPages } = pagination
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      // Hiển thị tất cả các trang nếu ít hơn 7
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Trang đầu
      pages.push(1)

      // Dấu ba chấm trước nếu cần
      if (current > 3) {
        pages.push('...')
      }

      // Các trang xung quanh trang hiện tại
      const start = Math.max(2, current - 1)
      const end = Math.min(totalPages - 1, current + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      // Dấu ba chấm sau nếu cần
      if (current < totalPages - 2) {
        pages.push('...')
      }

      // Trang cuối
      pages.push(totalPages)
    }

    return pages
  }

  const handleRevoke = async (hash: string) => {
    if (isRevoking) return
    if (!confirm('Thu hồi chứng chỉ này?')) return
    setIsRevoking(hash)
    try {
      await revokeCert(hash)
      await fetchCerts(page)
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Thu hồi thất bại')
    } finally {
      setIsRevoking(null)
    }
  }

  const renderBody = () => {
    if (isLoading) return <div className='loading-state'>Đang tải danh sách chứng chỉ...</div>
    if (error) return <div className='alert'>⚠️ {error}</div>
    if (!certs.length) return <div className='empty-state'>Chưa có chứng chỉ nào được cấp phát.</div>

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
                  <th>Ngày cấp</th>
                  <th>Ngày thu hồi</th>
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
                        <span className='hash-text' title={cert.docHash}>{truncateHash(cert.docHash)}</span>
                        <button 
                          className='hash-copy-btn' 
                          onClick={(e) => copyToClipboard(cert.docHash, e.currentTarget)}
                          title='Copy hash'
                          aria-label='Copy hash'
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td><StatusBadge status={cert.status} /></td>
                    <td className='date-cell'>{formatDateShort(cert.createdAt || cert.issuedDate)}</td>
                    <td className='date-cell'>{formatDateShort(cert.revokedAt)}</td>
                    <td>
                      <div className='table-actions'>
                        <a className='btn btn-sm btn-ghost' href={`${window.location.origin}/verify?hash=${cert.docHash}`} target='_blank' rel='noreferrer'>Verify</a>
                        {cert.metadataUri && (
                          <a className='btn btn-sm btn-ghost' href={cert.metadataUri} target='_blank' rel='noreferrer'>Metadata</a>
                        )}
                        {cert.status === 'VALID' && (
                          <button
                            className='btn btn-sm btn-outline'
                            onClick={() => handleRevoke(cert.docHash)}
                            disabled={Boolean(isRevoking)}
                          >
                            {isRevoking === cert.docHash ? '...' : 'Thu hồi'}
                          </button>
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
                    <span className='hash-text'>{truncateHash(cert.docHash, 6, 4)}</span>
                    <button 
                      className='hash-copy-btn' 
                      onClick={(e) => copyToClipboard(cert.docHash, e.currentTarget)}
                      title='Copy hash'
                      aria-label='Copy hash'
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div className='cert-info-row'>
                  <span className='cert-label'>Ngày cấp:</span>
                  <span className='cert-value'>{formatDateShort(cert.createdAt || cert.issuedDate)}</span>
                </div>

                {cert.revokedAt && (
                  <div className='cert-info-row'>
                    <span className='cert-label'>Ngày thu hồi:</span>
                    <span className='cert-value'>{formatDateShort(cert.revokedAt)}</span>
                  </div>
                )}
              </div>

              <div className='cert-card-actions'>
                <a className='btn btn-ghost' href={`${window.location.origin}/verify?hash=${cert.docHash}`} target='_blank' rel='noreferrer'>
                  Xem verify
                </a>
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
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className='pagination'>
          <span className='pagination-info'>Trang {pagination.page} / {pagination.totalPages} (Tổng: {pagination.total} chứng chỉ)</span>
          <div className='pagination-actions'>
            <button 
              className='btn btn-ghost' 
              onClick={() => {
                const newPage = Math.max(pagination.page - 1, 1)
                setPage(newPage)
              }} 
              disabled={pagination.page <= 1 || isLoading}
            >
              ‹ Trước
            </button>
            <div className='pagination-numbers'>
              {getPageNumbers().map((pageNum, idx) => {
                if (pageNum === '...') {
                  return <span key={`ellipsis-${idx}`} className='pagination-ellipsis'>...</span>
                }
                const pageNumValue = pageNum as number
                return (
                  <button
                    key={pageNumValue}
                    className={`btn ${pageNumValue === pagination.page ? 'btn-primary' : 'btn-ghost'} pagination-number`}
                    onClick={() => setPage(pageNumValue)}
                    disabled={isLoading}
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
            >
              Sau ›
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <div className='page-eyebrow'>Issuer Dashboard</div>
          <h1 className='page-title'>Quản lý chứng chỉ</h1>
          <p className='page-subtitle'>Theo dõi toàn bộ chứng chỉ đã cấp phát và thu hồi trực tiếp tại đây.</p>
        </div>
        <button className='btn btn-ghost' onClick={() => fetchCerts(page)} disabled={isLoading}>Làm mới</button>
      </div>

      <section className='card'>
        <header className='card-header'>
          <h2 className='card-title'>Danh sách chứng chỉ</h2>
          <p className='card-subtitle'>Bao gồm thông tin hash, trạng thái và đường dẫn verify/metadata.</p>
        </header>
        <form className='filter-bar' onSubmit={handleSearch}>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder='Tìm theo hash, người nhận, văn bằng...'
          />
          <select value={status} onChange={handleStatusChange}>
            <option value='ALL'>Tất cả trạng thái</option>
            <option value='VALID'>Hợp lệ</option>
            <option value='REVOKED'>Đã thu hồi</option>
          </select>
          <button type='submit' className='btn btn-primary' disabled={isLoading}>Tìm kiếm</button>
          <button type='button' className='btn btn-ghost' onClick={handleResetFilters} disabled={isLoading}>Xoá lọc</button>
        </form>
        {renderBody()}
      </section>
    </div>
  )
}
