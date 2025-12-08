import { useState, useEffect, useMemo } from 'react'
import { 
  IconZoomScan, 
  IconCircleCheck, 
  IconCircleX, 
  IconCertificateOff, 
  IconClockEdit, 
  IconShieldCheck, 
  IconFileInfo,
  IconUserPlus
} from '@tabler/icons-react'
import StatusBadge from '../components/StatusBadge'
import IconButton from '../components/IconButton'
import PreviewModal from '../components/PreviewModal'
import UserSelector from '../components/UserSelector'
import { getIconColor } from '../utils/iconColors'
import { CertSummary, CertListResponse, listPendingCerts, approveCert, rejectCert, CertStatus, updateExpirationDate, revokeCertByAdmin, transferCertificate } from '../api/certs.api'
import { getCredentialTypeById } from '../api/credential-types.api'
import { listValidityOptions, CredentialValidityOption } from '../api/credential-validity-options.api'
import { formatDateShort } from '../utils/format'
import { useAuth } from '../hooks/useAuth'
import { decodeJwt } from '../utils/jwt'
import { getPageNumbers } from '../utils/common'
import { usePagination } from '../hooks/usePagination'
import { useSearch } from '../hooks/useSearch'

const DEFAULT_PAGE_LIMIT = 10

export default function AdminManage() {
  const { token } = useAuth()

  const currentUserInfo = useMemo(() => {
    if (!token) return { role: null }
    const decoded = decodeJwt(token)
    return {
      role: (decoded as any)?.role || null
    }
  }, [token])

  // Certs state
  const [certs, setCerts] = useState<CertSummary[]>([])
  const [certStatus, setCertStatus] = useState<'ALL' | CertStatus>('PENDING')
  const [isLoadingCerts, setIsLoadingCerts] = useState(false)
  const [certError, setCertError] = useState<string | null>(null)
  
  const { pagination: certPagination, page: certPage, limit: certLimit, setPage: setCertPage, setLimit: setCertLimit, updatePagination: updateCertPagination } = usePagination({ defaultLimit: DEFAULT_PAGE_LIMIT })
  const { searchText: certSearchText, appliedSearch: certAppliedSearch, setSearchText: setCertSearchText } = useSearch()
  const [selectedCert, setSelectedCert] = useState<CertSummary | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [allowReupload, setAllowReupload] = useState(false)
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [expirationDate, setExpirationDate] = useState('')
  const [showUpdateExpirationModal, setShowUpdateExpirationModal] = useState(false)
  const [certIssuedDate, setCertIssuedDate] = useState('') // Ngày cert được tạo ở cơ quan
  const [validityOptions, setValidityOptions] = useState<CredentialValidityOption[]>([])
  const [selectedValidityOptionId, setSelectedValidityOptionId] = useState<string>('')
  const [useCustomExpiration, setUseCustomExpiration] = useState(false) // Chọn ngày hết hạn custom
  const [isPermanent, setIsPermanent] = useState(false)
  const [isLoadingValidityOptions, setIsLoadingValidityOptions] = useState(false)
  const [previewCert, setPreviewCert] = useState<CertSummary | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteContent, setNoteContent] = useState<{ type: 'rejection' | 'reupload' | 'both'; rejectionReason?: string; reuploadNote?: string } | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferNewUserId, setTransferNewUserId] = useState<string | null>(null)
  const [transferNote, setTransferNote] = useState('')
  const [transferHolderName, setTransferHolderName] = useState('')
  const [isUpdatingExpiration, setIsUpdatingExpiration] = useState(false)

  // Fetch certs
  const fetchCerts = async (page?: number, limit?: number, search?: string, status?: 'ALL' | CertStatus) => {
    const requestedPage = page ?? certPage
    const requestedLimit = limit ?? certLimit
    const requestedSearch = search !== undefined ? search : certAppliedSearch
    const requestedStatus = status !== undefined ? status : certStatus

    // Clear certs ngay lập tức khi filter thay đổi
    setCerts([])
    setIsLoadingCerts(true)
    setCertError(null)
    
    try {
      const response: CertListResponse = await listPendingCerts({
        page: requestedPage,
        limit: requestedLimit,
        q: requestedSearch || undefined,
        status: requestedStatus === 'ALL' ? undefined : requestedStatus,
      })
      
      setCerts(response.items)
      updateCertPagination(response.pagination)
    } catch (err: any) {
      setCertError(err.message || 'Không thể tải danh sách chứng chỉ')
      setCerts([])
    } finally {
      setIsLoadingCerts(false)
    }
  }

  useEffect(() => {
    setCertPage(1)
    fetchCerts(1, certLimit, certAppliedSearch, certStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certAppliedSearch, certStatus, certLimit])

  useEffect(() => {
    fetchCerts(certPage, certLimit, certAppliedSearch, certStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certPage])

  // Load validity options khi mở approve modal hoặc update expiration modal
  useEffect(() => {
    const loadValidityData = async () => {
      if ((showApproveModal || showUpdateExpirationModal) && selectedCert) {
        setIsLoadingValidityOptions(true)
        try {
          // Load credential type để check isPermanent
          if (selectedCert.credentialTypeId) {
            try {
              const credType = await getCredentialTypeById(selectedCert.credentialTypeId)
              setIsPermanent(credType.isPermanent)
              
              // Nếu không phải vĩnh viễn, load validity options
              if (!credType.isPermanent) {
                const options = await listValidityOptions(selectedCert.credentialTypeId)
                setValidityOptions(options.items || [])
              } else {
                setValidityOptions([])
              }
            } catch (err) {
              // Nếu không load được credential type, thử load tất cả validity options
              console.warn('Could not load credential type, trying to load all validity options:', err)
              setIsPermanent(false)
              const options = await listValidityOptions()
              setValidityOptions(options.items || [])
            }
          } else {
            // Nếu không có credentialTypeId, thử load tất cả validity options
            setIsPermanent(false)
            try {
              const options = await listValidityOptions()
              setValidityOptions(options.items || [])
            } catch (err) {
              console.warn('Could not load validity options:', err)
              setValidityOptions([])
            }
          }

          // Set ngày cert được tạo mặc định = ngày hiện tại hoặc ngày đã có (chỉ cho approve modal)
          if (showApproveModal) {
            if (selectedCert.issuedDate) {
              setCertIssuedDate(selectedCert.issuedDate)
            } else {
              setCertIssuedDate(new Date().toISOString().split('T')[0])
            }
            
            // Reset expirationDate khi mở modal approve
            setExpirationDate('')
            setSelectedValidityOptionId('')
            setUseCustomExpiration(false)
          }
          
          // Đối với update modal, set các giá trị hiện tại của cert
          if (showUpdateExpirationModal) {
            // certIssuedDate và expirationDate đã được set khi click button
            // Chỉ cần đảm bảo validityOptionId được set đúng nếu có
            if (selectedCert.validityOptionId && !selectedValidityOptionId) {
              setSelectedValidityOptionId(selectedCert.validityOptionId)
              setUseCustomExpiration(false)
            } else if (!selectedCert.validityOptionId && selectedCert.expirationDate && !useCustomExpiration) {
              setUseCustomExpiration(true)
            }
          }
        } catch (err: any) {
          console.error('Error loading validity data:', err)
          setIsPermanent(false)
          setValidityOptions([])
        } finally {
          setIsLoadingValidityOptions(false)
        }
      }
    }
    loadValidityData()
  }, [showApproveModal, showUpdateExpirationModal, selectedCert])

  // Helper function để tính expiration date từ validity option
  const calculateExpirationDate = (): string | undefined => {
    if (expirationDate) return expirationDate
    if (!selectedValidityOptionId || !certIssuedDate || useCustomExpiration) return undefined

    const selectedOption = validityOptions.find(opt => opt.id === selectedValidityOptionId)
    if (!selectedOption) return undefined

    const baseDate = new Date(certIssuedDate)
    if (selectedOption.periodMonths) {
      baseDate.setMonth(baseDate.getMonth() + selectedOption.periodMonths)
    } else if (selectedOption.periodDays) {
      baseDate.setDate(baseDate.getDate() + selectedOption.periodDays)
    }
    return baseDate.toISOString().split('T')[0]
  }

  // Helper function để reset form state
  const resetFormState = () => {
    setExpirationDate('')
    setCertIssuedDate('')
    setSelectedValidityOptionId('')
    setUseCustomExpiration(false)
    setValidityOptions([])
    setIsPermanent(false)
  }

  // Approve cert
  const handleApprove = async () => {
    if (!selectedCert || isApproving) return

    // Validate: Nếu không phải vĩnh viễn, cần có expirationDate
    if (!isPermanent && !expirationDate && !selectedValidityOptionId) {
      alert('Vui lòng chọn thời hạn hoặc nhập ngày hết hạn')
      return
    }

    setIsApproving(true)
    try {
      const finalExpirationDate = calculateExpirationDate()

      await approveCert(selectedCert.id, {
        issuedDate: certIssuedDate || undefined,
        expirationDate: finalExpirationDate,
        validityOptionId: useCustomExpiration ? undefined : (selectedValidityOptionId || undefined),
      })
      setShowApproveModal(false)
      setSelectedCert(null)
      resetFormState()
      await fetchCerts(certPage, certLimit, certAppliedSearch, certStatus)
    } catch (err: any) {
      alert(err.message || 'Không thể duyệt chứng chỉ')
    } finally {
      setIsApproving(false)
    }
  }

  // Reject cert
  const handleReject = async () => {
    if (!selectedCert || !rejectionReason.trim() || isRejecting) {
      if (!rejectionReason.trim()) {
        alert('Vui lòng nhập lý do từ chối')
      }
      return
    }
    setIsRejecting(true)
    try {
      await rejectCert(selectedCert.id, rejectionReason, allowReupload)
      setShowRejectModal(false)
      setSelectedCert(null)
      setRejectionReason('')
      setAllowReupload(false)
      await fetchCerts(certPage, certLimit, certAppliedSearch, certStatus)
    } catch (err: any) {
      alert(err.message || 'Không thể từ chối chứng chỉ')
    } finally {
      setIsRejecting(false)
    }
  }

  // Revoke cert by admin
  const handleRevokeByAdmin = async () => {
    if (!selectedCert) return
    
    setIsRevoking(true)
    try {
      await revokeCertByAdmin(selectedCert.id)
      setShowRevokeModal(false)
      setSelectedCert(null)
      // Refresh với đầy đủ filters
      await fetchCerts(certPage, certLimit, certAppliedSearch, certStatus)
    } catch (err: any) {
      alert(err.message || 'Không thể thu hồi chứng chỉ')
    } finally {
      setIsRevoking(false)
    }
  }

  // Transfer certificate to another user
  const handleTransferCertificate = async () => {
    if (!selectedCert || !transferNewUserId || !transferNote.trim()) return
    
    setIsTransferring(true)
    try {
      const result = await transferCertificate(
        selectedCert.id, 
        transferNewUserId, 
        transferNote.trim(),
        transferHolderName.trim() || undefined
      )
      setShowTransferModal(false)
      setSelectedCert(null)
      setTransferNewUserId(null)
      setTransferNote('')
      setTransferHolderName('')
      // Refresh với đầy đủ filters - đảm bảo refresh ngay lập tức
      setCerts([]) // Clear certs trước để hiển thị loading
      await fetchCerts(certPage, certLimit, certAppliedSearch, certStatus)
      alert(result.message || 'Đã chuyển chứng chỉ thành công')
    } catch (err: any) {
      alert(err.message || 'Không thể chuyển chứng chỉ')
    } finally {
      setIsTransferring(false)
    }
  }

  // Update expiration date and issued date
  const handleUpdateExpiration = async () => {
    if (!selectedCert) return

    // Validate: Nếu không phải vĩnh viễn, cần có expirationDate
    if (!isPermanent && !expirationDate && !selectedValidityOptionId) {
      alert('Vui lòng chọn thời hạn hoặc nhập ngày hết hạn')
      return
    }

    setIsUpdatingExpiration(true)
    try {
      const finalExpirationDate = calculateExpirationDate()

      await updateExpirationDate(selectedCert.id, {
        issuedDate: certIssuedDate || undefined,
        expirationDate: finalExpirationDate,
        validityOptionId: useCustomExpiration ? undefined : (selectedValidityOptionId || undefined),
      })
      setShowUpdateExpirationModal(false)
      setSelectedCert(null)
      resetFormState()
      await fetchCerts(certPage, certLimit, certAppliedSearch, certStatus)
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật thời gian tồn tại')
    } finally {
      setIsUpdatingExpiration(false)
    }
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <h1 className='page-title'>Quản lý Chứng chỉ</h1>
          <p className='page-subtitle'>Duyệt, từ chối và quản lý các chứng chỉ đã được upload</p>
        </div>
      </div>

      <div className='card'>
        <div className='card-header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className='card-title'>Danh sách chứng chỉ</h2>
            <p className='card-subtitle'>
              {certPagination.total > 0 
                ? `Tổng cộng: ${certPagination.total} chứng chỉ • Trang ${certPage}/${certPagination.totalPages}`
                : 'Duyệt hoặc từ chối các chứng chỉ đã được upload.'
              }
            </p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type='text'
              placeholder='Tìm theo hash, người nhận, văn bằng...'
              value={certSearchText}
              onChange={(e) => {
                const newSearchText = e.target.value
                setCertSearchText(newSearchText)
                setCertPage(1)
                // Clear certs ngay lập tức khi user đang gõ
                if (newSearchText === '') {
                  setCerts([])
                }
              }}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                fontSize: '14px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              value={certStatus} 
              onChange={(e) => { 
                const newStatus = e.target.value as any
                setCertStatus(newStatus)
                setCertPage(1)
                // Clear certs ngay lập tức
                setCerts([])
                fetchCerts(1, certLimit, certAppliedSearch, newStatus)
              }}
              style={{ minWidth: '140px', padding: '8px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value='PENDING'>Chờ duyệt</option>
              <option value='ALL'>Tất cả</option>
              <option value='APPROVED'>Đã duyệt</option>
              <option value='REJECTED'>Bị từ chối</option>
              <option value='VALID'>Hợp lệ</option>
              <option value='REVOKED'>Đã thu hồi</option>
              <option value='EXPIRED'>Đã hết hạn</option>
            </select>
            <label style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>Hiển thị:</label>
            <select
              value={certLimit}
              onChange={(e) => {
                const newLimit = Number(e.target.value)
                setCertLimit(newLimit)
                setCertPage(1)
                // Clear certs ngay lập tức
                setCerts([])
                fetchCerts(1, newLimit, certAppliedSearch, certStatus)
              }}
              style={{ minWidth: '100px', padding: '8px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value='5'>5</option>
              <option value='10'>10</option>
              <option value='20'>20</option>
              <option value='50'>50</option>
            </select>
          </div>
        </div>

        {certError && <div className='alert' style={{ margin: '16px' }}>⚠️ {certError}</div>}
        {isLoadingCerts ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Đang tải...</div>
        ) : certs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
            {certStatus === 'PENDING' 
              ? 'Không có chứng chỉ nào đang chờ duyệt.' 
              : 'Không có chứng chỉ nào.'}
          </div>
        ) : (
          <>
            <div className='table-wrapper'>
              <table className='data-table'>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Người nhận</th>
                    <th style={{ textAlign: 'center' }}>Văn bằng</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Ngày cấp</th>
                    <th style={{ textAlign: 'center' }}>Ngày hết hạn</th>
                    <th style={{ textAlign: 'center' }}>Ngày upload</th>
                    <th style={{ textAlign: 'center' }}>Ngày thu hồi</th>
                    <th style={{ textAlign: 'center' }}>Ghi chú</th>
                    <th style={{ textAlign: 'center' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((cert) => (
                    <tr key={cert.id}>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '13px' }}>{cert.holderName}</td>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#6b7280' }}>{cert.degree}</td>
                      <td style={{ textAlign: 'center', padding: '8px' }}><StatusBadge status={cert.status} /></td>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '12px' }}>{formatDateShort(cert.issuedDate)}</td>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '12px' }}>{cert.expirationDate ? formatDateShort(cert.expirationDate) : '-'}</td>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '12px' }}>{formatDateShort(cert.certxIssuedDate)}</td>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '12px' }}>{cert.revokedAt ? formatDateShort(cert.revokedAt) : '-'}</td>
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
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                          {/* Xem trước file - cho tất cả status nếu có file */}
                          {(currentUserInfo.role === 'ADMIN' || currentUserInfo.role === 'SUPER_ADMIN') && (
                            <IconButton
                              icon={<IconZoomScan size={16} />}
                              label='Xem trước'
                              iconColor={getIconColor('preview')}
                              onClick={() => setPreviewCert(cert)}
                              variant='ghost'
                            />
                          )}
                          
                          {/* PENDING: Duyệt, Từ chối */}
                          {cert.status === 'PENDING' && (currentUserInfo.role === 'ADMIN' || currentUserInfo.role === 'SUPER_ADMIN') && (
                            <>
                              <IconButton
                                icon={<IconCircleCheck size={16} />}
                                label='Duyệt'
                                iconColor={getIconColor('approve')}
                                onClick={() => { 
                                  setSelectedCert(cert)
                                  setExpirationDate('')
                                  setSelectedValidityOptionId('')
                                  setUseCustomExpiration(false)
                                  setShowApproveModal(true) 
                                }}
                                variant='primary'
                              />
                              <IconButton
                                icon={<IconCircleX size={16} />}
                                label='Từ chối'
                                iconColor={getIconColor('reject')}
                                onClick={() => { setSelectedCert(cert); setRejectionReason(''); setAllowReupload(false); setShowRejectModal(true) }}
                                variant='outline'
                              />
                            </>
                          )}
                          
                          {/* VALID: Thu hồi, Chỉnh sửa thời gian, Verify */}
                          {cert.status === 'VALID' && (currentUserInfo.role === 'ADMIN' || currentUserInfo.role === 'SUPER_ADMIN') && (
                            <>
                              <IconButton
                                icon={<IconCertificateOff size={16} />}
                                label='Thu hồi'
                                iconColor={getIconColor('revoke')}
                                onClick={() => { setSelectedCert(cert); setShowRevokeModal(true) }}
                                variant='outline'
                              />
                              <IconButton
                                icon={<IconClockEdit size={16} />}
                                label='Chỉnh sửa thời gian'
                                iconColor={getIconColor('editTime')}
                                onClick={() => { 
                                  setSelectedCert(cert)
                                  setCertIssuedDate(cert.issuedDate || '')
                                  setExpirationDate(cert.expirationDate || '')
                                  // Nếu cert có validityOptionId, set nó; nếu không có nhưng có expirationDate, dùng custom
                                  if (cert.validityOptionId) {
                                    setSelectedValidityOptionId(cert.validityOptionId)
                                    setUseCustomExpiration(false)
                                  } else if (cert.expirationDate) {
                                    setSelectedValidityOptionId('')
                                    setUseCustomExpiration(true)
                                  } else {
                                    setSelectedValidityOptionId('')
                                    setUseCustomExpiration(false)
                                  }
                                  setShowUpdateExpirationModal(true)
                                }}
                                variant='ghost'
                              />
                              {cert.docHash && (
                                <IconButton
                                  icon={<IconShieldCheck size={16} />}
                                  label='Verify'
                                  iconColor={getIconColor('verify')}
                                  href={`/verify?hash=${cert.docHash}`}
                                  target='_blank'
                                  rel='noreferrer'
                                  variant='ghost'
                                />
                              )}
                              {currentUserInfo.role === 'SUPER_ADMIN' && (
                                <IconButton
                                  icon={<IconUserPlus size={16} />}
                                  label='Chuyển người nhận'
                                  iconColor={getIconColor('transfer')}
                                  onClick={() => {
                                    setSelectedCert(cert)
                                    setTransferNewUserId(null)
                                    setTransferNote('')
                                    setTransferHolderName('')
                                    setShowTransferModal(true)
                                  }}
                                  variant='ghost'
                                />
                              )}
                            </>
                          )}
                          
                          {/* REVOKED: Verify (nếu có docHash) */}
                          {cert.status === 'REVOKED' && cert.docHash && (
                            <IconButton
                              icon={<IconShieldCheck size={16} />}
                              label='Verify'
                              iconColor={getIconColor('verify')}
                              href={`/verify?hash=${cert.docHash}`}
                              target='_blank'
                              rel='noreferrer'
                              variant='ghost'
                            />
                          )}
                          
                          {/* Metadata - chỉ SuperAdmin */}
                          {cert.metadataUri && currentUserInfo.role === 'SUPER_ADMIN' && (
                            <IconButton
                              icon={<IconFileInfo size={16} />}
                              label='Metadata'
                              iconColor={getIconColor('metadata')}
                              href={cert.metadataUri}
                              target='_blank'
                              rel='noreferrer'
                              variant='ghost'
                            />
                          )}
                          
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination for Certs */}
            {certPagination.total > 0 && (
              <div className='pagination' style={{ padding: '16px', borderTop: '1px solid #eee' }}>
                <span className='pagination-info'>
                  Trang {certPage} / {certPagination.totalPages} (Tổng: {certPagination.total} chứng chỉ)
                </span>
                {certPagination.totalPages > 1 && (
                  <div className='pagination-actions'>
                    <button 
                      className='btn btn-ghost' 
                      onClick={() => setCertPage(certPage - 1)} 
                      disabled={certPage <= 1 || isLoadingCerts}
                    >
                      ‹ Trước
                    </button>
                    <div className='pagination-numbers'>
                      {getPageNumbers(certPage, certPagination.totalPages).map((pageNum, idx) => {
                        if (pageNum === '...') {
                          return <span key={`ellipsis-${idx}`} className='pagination-ellipsis'>...</span>
                        }
                        return (
                          <button
                            key={pageNum}
                            className={`btn ${pageNum === certPage ? 'btn-primary' : 'btn-ghost'} pagination-number`}
                            onClick={() => setCertPage(pageNum as number)}
                            disabled={isLoadingCerts}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button 
                      className='btn btn-ghost' 
                      onClick={() => setCertPage(certPage + 1)} 
                      disabled={certPage >= certPagination.totalPages || isLoadingCerts}
                    >
                      Sau ›
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedCert && (
        <div className='modal-overlay' onClick={() => {
          setShowApproveModal(false)
          setCertIssuedDate('')
          setSelectedValidityOptionId('')
          setUseCustomExpiration(false)
          setExpirationDate('')
        }}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>Duyệt chứng chỉ</h3>
              <button className='modal-close-btn' onClick={() => {
                setShowApproveModal(false)
                setCertIssuedDate('')
                setSelectedValidityOptionId('')
                setUseCustomExpiration(false)
                setExpirationDate('')
              }}>×</button>
            </div>
            <div className='modal-body' style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <p><strong>Người nhận:</strong> {selectedCert.holderName}</p>
                <p><strong>Văn bằng:</strong> {selectedCert.degree}</p>
              </div>

              {/* Ngày cert được tạo ở cơ quan */}
              <div className='field'>
                <label>Ngày cert được tạo (ở cơ quan) *</label>
                <input 
                  type='date' 
                  value={certIssuedDate} 
                  onChange={(e) => {
                    const newIssuedDate = e.target.value
                    setCertIssuedDate(newIssuedDate)
                    
                    // Nếu đã chọn validity option, tự động tính lại expirationDate
                    if (selectedValidityOptionId && newIssuedDate) {
                      const selectedOption = validityOptions.find(opt => opt.id === selectedValidityOptionId)
                      if (selectedOption) {
                        const baseDate = new Date(newIssuedDate)
                        let calculatedExpirationDate: string | undefined
                        
                        if (selectedOption.periodMonths) {
                          baseDate.setMonth(baseDate.getMonth() + selectedOption.periodMonths)
                          calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                        } else if (selectedOption.periodDays) {
                          baseDate.setDate(baseDate.getDate() + selectedOption.periodDays)
                          calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                        }
                        
                        setExpirationDate(calculatedExpirationDate || '')
                      }
                    }
                  }} 
                  required
                />
                <small className='field-hint'>Ngày mà chứng chỉ được cấp ở cơ quan (không phải ngày cấp phát trên hệ thống)</small>
              </div>

              {/* Ngày hết hạn - chỉ hiển thị nếu không phải vĩnh viễn */}
              {!isPermanent && (
                <>
                  {isLoadingValidityOptions ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#999' }}>Đang tải tùy chọn thời hạn...</div>
                  ) : (() => {
                    // Filter validity options theo credentialTypeId của cert
                    const filteredOptions = selectedCert?.credentialTypeId 
                      ? validityOptions.filter(opt => opt.credentialTypeId === selectedCert.credentialTypeId)
                      : []
                    
                    // Nếu có filteredOptions, hiển thị dropdown với option Custom
                    if (filteredOptions.length > 0) {
                      return (
                        <>
                          <div className='field'>
                            <label>Ngày hết hạn *</label>
                            <select 
                              value={useCustomExpiration ? 'custom' : selectedValidityOptionId} 
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === 'custom') {
                                  setUseCustomExpiration(true)
                                  setSelectedValidityOptionId('')
                                  setExpirationDate('')
                                } else {
                                  setUseCustomExpiration(false)
                                  setSelectedValidityOptionId(value)
                                  
                                  // Tự động tính ngày hết hạn dựa trên ngày cert được tạo và validity option
                                  if (value && certIssuedDate) {
                                    const selectedOption = filteredOptions.find(opt => opt.id === value)
                                    if (selectedOption) {
                                      const baseDate = new Date(certIssuedDate)
                                      let calculatedExpirationDate: string | undefined
                                      
                                      if (selectedOption.periodMonths) {
                                        baseDate.setMonth(baseDate.getMonth() + selectedOption.periodMonths)
                                        calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                                      } else if (selectedOption.periodDays) {
                                        baseDate.setDate(baseDate.getDate() + selectedOption.periodDays)
                                        calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                                      }
                                      
                                      setExpirationDate(calculatedExpirationDate || '')
                                    } else {
                                      setExpirationDate('')
                                    }
                                  } else {
                                    setExpirationDate('')
                                  }
                                }
                              }}
                              style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
                              required
                            >
                              <option value=''>-- Chọn thời hạn --</option>
                              {filteredOptions.map((opt) => {
                                // Format hiển thị: số tháng hoặc số năm
                                let displayText = ''
                                if (opt.periodMonths) {
                                  if (opt.periodMonths >= 12 && opt.periodMonths % 12 === 0) {
                                    const years = opt.periodMonths / 12
                                    displayText = years === 1 ? '1 năm' : `${years} năm`
                                  } else {
                                    displayText = `${opt.periodMonths} tháng`
                                  }
                                } else if (opt.periodDays) {
                                  if (opt.periodDays >= 365 && opt.periodDays % 365 === 0) {
                                    const years = opt.periodDays / 365
                                    displayText = years === 1 ? '1 năm' : `${years} năm`
                                  } else if (opt.periodDays >= 30 && opt.periodDays % 30 === 0) {
                                    const months = opt.periodDays / 30
                                    displayText = months === 1 ? '1 tháng' : `${months} tháng`
                                  } else {
                                    displayText = `${opt.periodDays} ngày`
                                  }
                                } else {
                                  displayText = 'N/A'
                                }
                                
                                return (
                                  <option key={opt.id} value={opt.id}>
                                    {displayText}
                                    {opt.note ? ` - ${opt.note}` : ''}
                                  </option>
                                )
                              })}
                              <option value='custom'>-- Chọn ngày hết hạn tùy chỉnh --</option>
                            </select>
                            <small className='field-hint'>
                              Chọn thời hạn từ danh sách (dựa trên văn bằng: {selectedCert?.degree || selectedCert?.credentialTypeId || 'N/A'}). Hệ thống sẽ tự động tính ngày hết hạn dựa trên ngày cert được tạo ({certIssuedDate ? new Date(certIssuedDate).toLocaleDateString('vi-VN') : 'chưa chọn'}).
                              {selectedValidityOptionId && expirationDate && !useCustomExpiration && (
                                <span style={{ display: 'block', marginTop: '4px', fontWeight: '500', color: '#059669' }}>
                                  → Ngày hết hạn: {new Date(expirationDate).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                            </small>
                          </div>
                          
                          {/* Hiển thị input date khi chọn Custom */}
                          {useCustomExpiration && (
                            <div className='field'>
                              <label>Ngày hết hạn (tùy chỉnh) *</label>
                              <input 
                                type='date' 
                                value={expirationDate} 
                                onChange={(e) => setExpirationDate(e.target.value)} 
                                required
                              />
                              <small className='field-hint'>Nhập ngày hết hạn tùy chỉnh</small>
                            </div>
                          )}
                        </>
                      )
                    } else {
                      // Nếu không có filteredOptions, chỉ hiển thị input date
                      return (
                        <div className='field'>
                          <label>Ngày hết hạn *</label>
                          <input 
                            type='date' 
                            value={expirationDate} 
                            onChange={(e) => setExpirationDate(e.target.value)} 
                            required
                          />
                          <small className='field-hint'>
                            {selectedCert?.credentialTypeId 
                              ? 'Nhập ngày hết hạn thủ công (không có tùy chọn thời hạn có sẵn cho loại văn bằng này)'
                              : 'Nhập ngày hết hạn thủ công (văn bằng này chưa có loại văn bằng được chọn)'}
                          </small>
                        </div>
                      )
                    }
                  })()}
                </>
              )}

              {isPermanent && (
                <div className='info-box' style={{ padding: '12px', background: 'rgba(5, 150, 105, 0.1)', borderRadius: '8px', marginTop: '16px' }}>
                  <small className='field-hint' style={{ color: '#059669' }}>
                    ✓ Loại văn bằng này là vĩnh viễn, không cần chọn thời hạn
                  </small>
                </div>
              )}
            </div>
            <div className='modal-actions'>
              <button className='btn btn-ghost' onClick={() => {
                setShowApproveModal(false)
                setCertIssuedDate('')
                setSelectedValidityOptionId('')
                setUseCustomExpiration(false)
                setExpirationDate('')
              }}>Hủy</button>
              <button 
                className='btn btn-primary' 
                onClick={handleApprove} 
                disabled={!certIssuedDate || isLoadingValidityOptions || isApproving || (!isPermanent && !expirationDate && !selectedValidityOptionId && !useCustomExpiration)}
              >
                {isApproving ? 'Đang duyệt...' : 'Duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedCert && (
        <div className='modal-overlay' onClick={() => { setShowRejectModal(false); setRejectionReason(''); setAllowReupload(false) }}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>Từ chối chứng chỉ</h3>
              <button className='modal-close-btn' onClick={() => { setShowRejectModal(false); setRejectionReason(''); setAllowReupload(false) }} aria-label='Đóng'>×</button>
            </div>
            <div className='modal-body'>
              <p>Người nhận: {selectedCert.holderName}</p>
              <div className='field'>
                <label>Lý do từ chối *</label>
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder='Nhập lý do từ chối...' required rows={4} />
              </div>
              <div className='field'>
                <label className='checkbox-label'>
                  <input type='checkbox' checked={allowReupload} onChange={(e) => setAllowReupload(e.target.checked)} />
                  <span>Cho phép user reup sau khi bị từ chối</span>
                </label>
                <small className='field-hint'>Nếu không chọn, user sẽ không thể reup chứng chỉ này</small>
              </div>
            </div>
            <div className='modal-actions'>
              <button className='btn btn-ghost' onClick={() => { setShowRejectModal(false); setRejectionReason(''); setAllowReupload(false) }}>Hủy</button>
              <button 
                className='btn btn-primary' 
                onClick={handleReject}
                disabled={isRejecting || !rejectionReason.trim()}
              >
                {isRejecting ? 'Đang từ chối...' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && selectedCert && (
        <div className='modal-overlay' onClick={() => { setShowRevokeModal(false); setSelectedCert(null) }}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>Thu hồi chứng chỉ</h3>
              <button className='modal-close-btn' onClick={() => { setShowRevokeModal(false); setSelectedCert(null) }} aria-label='Đóng'>×</button>
            </div>
            <div className='modal-body'>
              <div style={{ marginBottom: '16px' }}>
                <p><strong>Người nhận:</strong> {selectedCert.holderName}</p>
                <p><strong>Văn bằng:</strong> {selectedCert.degree}</p>
                {selectedCert.docHash && (
                  <p style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    <strong>Hash:</strong> {selectedCert.docHash}
                  </p>
                )}
              </div>
              <div className='alert' style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#b91c1c' }}>
                <strong>⚠️ Cảnh báo:</strong> Bạn có chắc chắn muốn thu hồi chứng chỉ này? Hành động này không thể hoàn tác. Chứng chỉ sẽ bị đánh dấu là đã thu hồi và không còn hiệu lực.
              </div>
            </div>
            <div className='modal-actions'>
              <button 
                className='btn btn-ghost' 
                onClick={() => { setShowRevokeModal(false); setSelectedCert(null) }}
                disabled={isRevoking}
              >
                Hủy
              </button>
              <button 
                className='btn btn-primary' 
                onClick={handleRevokeByAdmin}
                disabled={isRevoking}
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                {isRevoking ? 'Đang thu hồi...' : 'Xác nhận thu hồi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Certificate Modal */}
      {showTransferModal && selectedCert && (
        <div className='modal-overlay' onClick={() => { setShowTransferModal(false); setSelectedCert(null); setTransferNewUserId(null); setTransferNote(''); setTransferHolderName('') }}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>Chuyển người nhận chứng chỉ</h3>
              <button className='modal-close-btn' onClick={() => { setShowTransferModal(false); setSelectedCert(null); setTransferNewUserId(null); setTransferNote(''); setTransferHolderName('') }} aria-label='Đóng'>×</button>
            </div>
            <div className='modal-body'>
              <div style={{ marginBottom: '16px' }}>
                <p><strong>Người nhận hiện tại:</strong> {selectedCert.holderName}</p>
                <p><strong>Văn bằng:</strong> {selectedCert.degree}</p>
                {selectedCert.docHash && (
                  <p style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    <strong>Hash:</strong> {selectedCert.docHash}
                  </p>
                )}
              </div>
              
              <div className='field' style={{ marginBottom: '16px' }}>
                <label>Người nhận mới *</label>
                <UserSelector
                  value={transferNewUserId || undefined}
                  onChange={(userId, userName) => {
                    setTransferNewUserId(userId)
                    // Tự động điền tên khi chọn user, nhưng cho phép chỉnh sửa
                    if (userId && userName && !transferHolderName) {
                      setTransferHolderName(userName)
                    }
                  }}
                  placeholder='Chọn người nhận mới...'
                />
              </div>

              <div className='field' style={{ marginBottom: '16px' }}>
                <label>Tên người nhận (tùy chọn)</label>
                <input
                  type='text'
                  value={transferHolderName}
                  onChange={(e) => setTransferHolderName(e.target.value)}
                  placeholder='Nhập tên người nhận (để trống sẽ dùng tên từ user)...'
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
                <small className='field-hint' style={{ marginTop: '4px', display: 'block' }}>
                  Có thể chỉnh sửa tên người nhận hiển thị trên chứng chỉ. Nếu để trống, hệ thống sẽ dùng tên từ tài khoản user đã chọn.
                </small>
              </div>

              <div className='field' style={{ marginBottom: '16px' }}>
                <label>Ghi chú *</label>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder='Nhập lý do chuyển chứng chỉ...'
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <small className='field-hint' style={{ marginTop: '4px', display: 'block' }}>
                  Ghi chú này sẽ được lưu trong lịch sử chuyển đổi và audit log
                </small>
              </div>

              <div className='alert' style={{ background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#1e40af' }}>
                <strong>ℹ️ Lưu ý:</strong> Hành động này sẽ chuyển quyền sở hữu chứng chỉ sang người nhận mới. Thông tin này sẽ được ghi lại trong audit log.
              </div>
            </div>
            <div className='modal-actions'>
              <button
                className='btn btn-ghost'
                onClick={() => { setShowTransferModal(false); setSelectedCert(null); setTransferNewUserId(null); setTransferNote(''); setTransferHolderName('') }}
                disabled={isTransferring}
              >
                Hủy
              </button>
              <button
                className='btn btn-primary'
                onClick={handleTransferCertificate}
                disabled={isTransferring || !transferNewUserId || !transferNote.trim()}
              >
                {isTransferring ? 'Đang chuyển...' : 'Xác nhận chuyển'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Expiration Modal */}
      {showUpdateExpirationModal && selectedCert && (
        <div className='modal-overlay' onClick={() => { setShowUpdateExpirationModal(false); setExpirationDate(''); setSelectedValidityOptionId(''); setUseCustomExpiration(false); setCertIssuedDate('') }}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>Chỉnh sửa thời gian tồn tại</h3>
              <button className='modal-close-btn' onClick={() => { setShowUpdateExpirationModal(false); setExpirationDate(''); setSelectedValidityOptionId(''); setUseCustomExpiration(false); setCertIssuedDate('') }} aria-label='Đóng'>×</button>
            </div>
            <div className='modal-body' style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <p><strong>Người nhận:</strong> {selectedCert.holderName}</p>
                <p><strong>Văn bằng:</strong> {selectedCert.degree}</p>
              </div>

              {/* Ngày cert được tạo ở cơ quan */}
              <div className='field'>
                <label>Ngày cấp thật *</label>
                <input 
                  type='date' 
                  value={certIssuedDate} 
                  onChange={(e) => {
                    const newIssuedDate = e.target.value
                    setCertIssuedDate(newIssuedDate)
                    
                    // Nếu đã chọn validity option, tự động tính lại expirationDate
                    if (selectedValidityOptionId && newIssuedDate) {
                      const selectedOption = validityOptions.find(opt => opt.id === selectedValidityOptionId)
                      if (selectedOption) {
                        const baseDate = new Date(newIssuedDate)
                        let calculatedExpirationDate: string | undefined
                        
                        if (selectedOption.periodMonths) {
                          baseDate.setMonth(baseDate.getMonth() + selectedOption.periodMonths)
                          calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                        } else if (selectedOption.periodDays) {
                          baseDate.setDate(baseDate.getDate() + selectedOption.periodDays)
                          calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                        }
                        
                        setExpirationDate(calculatedExpirationDate || '')
                      }
                    }
                  }} 
                  required
                />
                <small className='field-hint'>Ngày chứng chỉ được cấp bởi cơ quan</small>
              </div>

              {/* Ngày hết hạn - chỉ hiển thị nếu không phải vĩnh viễn */}
              {!isPermanent && (
                <>
                  {isLoadingValidityOptions ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#999' }}>Đang tải tùy chọn thời hạn...</div>
                  ) : (() => {
                    // Filter validity options theo credentialTypeId của cert
                    const filteredOptions = selectedCert?.credentialTypeId 
                      ? validityOptions.filter(opt => opt.credentialTypeId === selectedCert.credentialTypeId)
                      : []
                    
                    // Nếu có filteredOptions, hiển thị dropdown với option Custom
                    if (filteredOptions.length > 0) {
                      return (
                        <>
                          <div className='field'>
                            <label>Ngày hết hạn *</label>
                            <select 
                              value={useCustomExpiration ? 'custom' : selectedValidityOptionId} 
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === 'custom') {
                                  setUseCustomExpiration(true)
                                  setSelectedValidityOptionId('')
                                  setExpirationDate('')
                                } else {
                                  setUseCustomExpiration(false)
                                  setSelectedValidityOptionId(value)
                                  
                                  // Tự động tính ngày hết hạn dựa trên ngày cert được tạo và validity option
                                  if (value && certIssuedDate) {
                                    const selectedOption = filteredOptions.find(opt => opt.id === value)
                                    if (selectedOption) {
                                      const baseDate = new Date(certIssuedDate)
                                      let calculatedExpirationDate: string | undefined
                                      
                                      if (selectedOption.periodMonths) {
                                        baseDate.setMonth(baseDate.getMonth() + selectedOption.periodMonths)
                                        calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                                      } else if (selectedOption.periodDays) {
                                        baseDate.setDate(baseDate.getDate() + selectedOption.periodDays)
                                        calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                                      }
                                      
                                      setExpirationDate(calculatedExpirationDate || '')
                                    } else {
                                      setExpirationDate('')
                                    }
                                  } else {
                                    setExpirationDate('')
                                  }
                                }
                              }}
                              style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
                              required
                            >
                              <option value=''>-- Chọn thời hạn --</option>
                              {filteredOptions.map((opt) => {
                                // Format hiển thị: số tháng hoặc số năm
                                let displayText = ''
                                if (opt.periodMonths) {
                                  if (opt.periodMonths >= 12 && opt.periodMonths % 12 === 0) {
                                    const years = opt.periodMonths / 12
                                    displayText = years === 1 ? '1 năm' : `${years} năm`
                                  } else {
                                    displayText = `${opt.periodMonths} tháng`
                                  }
                                } else if (opt.periodDays) {
                                  if (opt.periodDays >= 365 && opt.periodDays % 365 === 0) {
                                    const years = opt.periodDays / 365
                                    displayText = years === 1 ? '1 năm' : `${years} năm`
                                  } else if (opt.periodDays >= 30 && opt.periodDays % 30 === 0) {
                                    const months = opt.periodDays / 30
                                    displayText = months === 1 ? '1 tháng' : `${months} tháng`
                                  } else {
                                    displayText = `${opt.periodDays} ngày`
                                  }
                                } else {
                                  displayText = 'N/A'
                                }
                                
                                return (
                                  <option key={opt.id} value={opt.id}>
                                    {displayText}
                                    {opt.note ? ` - ${opt.note}` : ''}
                                  </option>
                                )
                              })}
                              <option value='custom'>-- Chọn ngày hết hạn tùy chỉnh --</option>
                            </select>
                            <small className='field-hint'>
                              Chọn thời hạn từ danh sách (dựa trên văn bằng: {selectedCert?.degree || selectedCert?.credentialTypeId || 'N/A'}). Hệ thống sẽ tự động tính ngày hết hạn dựa trên ngày cấp thật ({certIssuedDate ? new Date(certIssuedDate).toLocaleDateString('vi-VN') : 'chưa chọn'}).
                              {selectedValidityOptionId && expirationDate && !useCustomExpiration && (
                                <span style={{ display: 'block', marginTop: '4px', fontWeight: '500', color: '#059669' }}>
                                  → Ngày hết hạn: {new Date(expirationDate).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                            </small>
                          </div>
                          
                          {/* Hiển thị input date khi chọn Custom */}
                          {useCustomExpiration && (
                            <div className='field'>
                              <label>Ngày hết hạn (tùy chỉnh) *</label>
                              <input 
                                type='date' 
                                value={expirationDate} 
                                onChange={(e) => setExpirationDate(e.target.value)} 
                                required
                              />
                              <small className='field-hint'>Nhập ngày hết hạn tùy chỉnh</small>
                            </div>
                          )}
                        </>
                      )
                    } else {
                      // Nếu không có filteredOptions, chỉ hiển thị input date
                      return (
                        <div className='field'>
                          <label>Ngày hết hạn *</label>
                          <input 
                            type='date' 
                            value={expirationDate} 
                            onChange={(e) => setExpirationDate(e.target.value)} 
                            required
                          />
                          <small className='field-hint'>
                            {selectedCert?.credentialTypeId 
                              ? 'Nhập ngày hết hạn thủ công (không có tùy chọn thời hạn có sẵn cho loại văn bằng này)'
                              : 'Nhập ngày hết hạn thủ công (văn bằng này chưa có loại văn bằng được chọn)'}
                          </small>
                        </div>
                      )
                    }
                  })()}
                </>
              )}

              {isPermanent && (
                <div className='info-box' style={{ padding: '12px', background: 'rgba(5, 150, 105, 0.1)', borderRadius: '8px', marginTop: '16px' }}>
                  <small className='field-hint' style={{ color: '#059669' }}>
                    ✓ Loại văn bằng này là vĩnh viễn, không cần chọn thời hạn
                  </small>
                </div>
              )}
            </div>
            <div className='modal-actions'>
              <button 
                className='btn btn-ghost' 
                onClick={() => { setShowUpdateExpirationModal(false); setExpirationDate(''); setSelectedValidityOptionId(''); setUseCustomExpiration(false); setCertIssuedDate('') }}
                disabled={isUpdatingExpiration}
              >
                Hủy
              </button>
              <button 
                className='btn btn-primary' 
                onClick={handleUpdateExpiration}
                disabled={isUpdatingExpiration || !certIssuedDate || isLoadingValidityOptions || (!isPermanent && !expirationDate && !selectedValidityOptionId && !useCustomExpiration)}
              >
                {isUpdatingExpiration ? 'Đang cập nhật...' : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <PreviewModal
        cert={previewCert}
        isOpen={!!previewCert}
        onClose={() => setPreviewCert(null)}
      />

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

