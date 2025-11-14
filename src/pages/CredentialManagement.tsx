import { useState, useEffect, useCallback } from 'react'
import IconButton from '../components/IconButton'
import { 
  listCredentialTypes, 
  createCredentialType, 
  updateCredentialType, 
  deleteCredentialType,
  CredentialType 
} from '../api/credential-types.api'
import { 
  listValidityOptions, 
  createValidityOption, 
  updateValidityOption, 
  deleteValidityOption,
  CredentialValidityOption 
} from '../api/credential-validity-options.api'

const DEFAULT_PAGE_LIMIT = 10

export default function CredentialManagement() {
  // Credential Types state
  const [credentialTypes, setCredentialTypes] = useState<CredentialType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [editingType, setEditingType] = useState<CredentialType | null>(null)
  const [typeForm, setTypeForm] = useState({ id: '', name: '', isPermanent: false })
  const [typePagination, setTypePagination] = useState({ page: 1, limit: DEFAULT_PAGE_LIMIT, total: 0, totalPages: 1 })
  const [typeSearchText, setTypeSearchText] = useState('')
  const [typeAppliedSearch, setTypeAppliedSearch] = useState('')
  const [typeLimit, setTypeLimit] = useState(DEFAULT_PAGE_LIMIT)
  
  // Validity Options state (for the selected credential type in modal)
  const [currentTypeValidityOptions, setCurrentTypeValidityOptions] = useState<CredentialValidityOption[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [showOptionModal, setShowOptionModal] = useState(false)
  const [editingOption, setEditingOption] = useState<CredentialValidityOption | null>(null)
  const [optionForm, setOptionForm] = useState({ 
    id: '', 
    periodMonths: '' as string | number, 
    periodDays: '' as string | number, 
    note: '' 
  })

  // Load credential types
  const loadCredentialTypes = useCallback(async (page?: number, limit?: number) => {
    const requestedPage = page ?? typePagination.page
    const requestedLimit = limit ?? typeLimit
    setIsLoadingTypes(true)
    try {
      const response = await listCredentialTypes({
        q: typeAppliedSearch || undefined,
        page: requestedPage,
        limit: requestedLimit
      })
      setCredentialTypes(response.items || [])
      if (response.pagination) {
        setTypePagination(response.pagination)
      } else {
        setTypePagination({
          page: requestedPage,
          limit: requestedLimit,
          total: response.total || 0,
          totalPages: Math.ceil((response.total || 0) / requestedLimit)
        })
      }
    } catch (error: any) {
      alert(error.message || 'Không thể tải danh sách loại văn bằng')
    } finally {
      setIsLoadingTypes(false)
    }
  }, [typePagination, typeLimit, typeAppliedSearch])

  // Load validity options for a specific credential type
  const loadValidityOptionsForType = useCallback(async (credentialTypeId: string) => {
    if (!credentialTypeId) {
      setCurrentTypeValidityOptions([])
      return
    }
    setIsLoadingOptions(true)
    try {
      const response = await listValidityOptions(credentialTypeId)
      setCurrentTypeValidityOptions(response.items || [])
    } catch (error: any) {
      console.error('Error loading validity options:', error)
      setCurrentTypeValidityOptions([])
    } finally {
      setIsLoadingOptions(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setTypeAppliedSearch(typeSearchText)
      setTypePagination(prev => ({ ...prev, page: 1 }))
    }, 500)
    return () => clearTimeout(timer)
  }, [typeSearchText])

  // Load data when search or limit changes
  useEffect(() => {
    loadCredentialTypes(1, typeLimit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeAppliedSearch, typeLimit])

  // Load validity options when modal opens with a credential type
  useEffect(() => {
    if (showTypeModal && editingType && !editingType.isPermanent) {
      loadValidityOptionsForType(editingType.id)
    } else if (showTypeModal && typeForm.id && !typeForm.isPermanent) {
      // For new credential type, load options if ID is already set
      loadValidityOptionsForType(typeForm.id)
    } else {
      setCurrentTypeValidityOptions([])
    }
  }, [showTypeModal, editingType, typeForm.id, typeForm.isPermanent, loadValidityOptionsForType])

  // Credential Types handlers
  const openTypeModal = (type?: CredentialType) => {
    if (type) {
      setEditingType(type)
      setTypeForm({ id: type.id, name: type.name, isPermanent: type.isPermanent })
    } else {
      setEditingType(null)
      setTypeForm({ id: '', name: '', isPermanent: false })
      setCurrentTypeValidityOptions([])
    }
    setShowTypeModal(true)
  }

  const closeTypeModal = () => {
    setShowTypeModal(false)
    setEditingType(null)
    setTypeForm({ id: '', name: '', isPermanent: false })
    setCurrentTypeValidityOptions([])
    setShowOptionModal(false)
    setEditingOption(null)
  }

  const handleTypeSubmit = async () => {
    if (!typeForm.id.trim() || !typeForm.name.trim()) {
      alert('Vui lòng điền đầy đủ thông tin')
      return
    }

    try {
      if (editingType) {
        await updateCredentialType(editingType.id, {
          name: typeForm.name,
          isPermanent: typeForm.isPermanent
        })
      } else {
        await createCredentialType({
          id: typeForm.id.trim(),
          name: typeForm.name.trim(),
          isPermanent: typeForm.isPermanent
        })
      }
      closeTypeModal()
      loadCredentialTypes(typePagination.page, typeLimit)
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra')
    }
  }

  const handleTypeDelete = async (id: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa loại văn bằng "${id}"?`)) return

    try {
      await deleteCredentialType(id)
      // If deleting last item on page and not first page, go to previous page
      const newPage = typePagination.page > 1 && credentialTypes.length === 1 
        ? typePagination.page - 1 
        : typePagination.page
      loadCredentialTypes(newPage, typeLimit)
    } catch (error: any) {
      alert(error.message || 'Không thể xóa loại văn bằng')
    }
  }

  // Validity Options handlers (within credential type modal)
  const openOptionModal = (option?: CredentialValidityOption) => {
    const currentCredentialTypeId = editingType?.id || typeForm.id
    if (!currentCredentialTypeId) {
      alert('Vui lòng nhập ID loại văn bằng trước')
      return
    }

    if (option) {
      setEditingOption(option)
      setOptionForm({
        id: option.id,
        periodMonths: option.periodMonths || '',
        periodDays: option.periodDays || '',
        note: option.note || ''
      })
    } else {
      setEditingOption(null)
      setOptionForm({ 
        id: '', 
        periodMonths: '', 
        periodDays: '', 
        note: '' 
      })
    }
    setShowOptionModal(true)
  }

  const closeOptionModal = () => {
    setShowOptionModal(false)
    setEditingOption(null)
    setOptionForm({ id: '', periodMonths: '', periodDays: '', note: '' })
  }

  const handleOptionSubmit = async () => {
    const currentCredentialTypeId = editingType?.id || typeForm.id
    if (!currentCredentialTypeId) {
      alert('Vui lòng nhập ID loại văn bằng trước')
      return
    }

    if (!optionForm.id.trim()) {
      alert('Vui lòng điền ID tùy chọn thời hạn')
      return
    }

    const periodMonths = optionForm.periodMonths === '' ? null : Number(optionForm.periodMonths)
    const periodDays = optionForm.periodDays === '' ? null : Number(optionForm.periodDays)

    if (periodMonths === null && periodDays === null) {
      alert('Cần có ít nhất một trong hai: Số tháng hoặc Số ngày')
      return
    }

    try {
      if (editingOption) {
        await updateValidityOption(editingOption.id, {
          credentialTypeId: currentCredentialTypeId,
          periodMonths,
          periodDays,
          note: optionForm.note.trim() || null
        })
      } else {
        await createValidityOption({
          id: optionForm.id.trim(),
          credentialTypeId: currentCredentialTypeId,
          periodMonths,
          periodDays,
          note: optionForm.note.trim() || null
        })
      }
      closeOptionModal()
      // Reload validity options for current credential type
      if (currentCredentialTypeId) {
        loadValidityOptionsForType(currentCredentialTypeId)
      }
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra')
    }
  }

  const handleOptionDelete = async (id: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tùy chọn thời hạn "${id}"?`)) return

    const currentCredentialTypeId = editingType?.id || typeForm.id
    try {
      await deleteValidityOption(id)
      // Reload validity options for current credential type
      if (currentCredentialTypeId) {
        loadValidityOptionsForType(currentCredentialTypeId)
      }
    } catch (error: any) {
      alert(error.message || 'Không thể xóa tùy chọn thời hạn')
    }
  }

  // Format period display
  const formatPeriod = (option: CredentialValidityOption): string => {
    if (option.periodMonths) {
      if (option.periodMonths >= 12 && option.periodMonths % 12 === 0) {
        const years = option.periodMonths / 12
        return years === 1 ? '1 năm' : `${years} năm`
      }
      return `${option.periodMonths} tháng`
    }
    if (option.periodDays) {
      if (option.periodDays >= 365 && option.periodDays % 365 === 0) {
        const years = option.periodDays / 365
        return years === 1 ? '1 năm' : `${years} năm`
      }
      if (option.periodDays >= 30 && option.periodDays % 30 === 0) {
        const months = option.periodDays / 30
        return months === 1 ? '1 tháng' : `${months} tháng`
      }
      return `${option.periodDays} ngày`
    }
    return 'N/A'
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <h1 className='page-title'>Quản lý Loại văn bằng</h1>
          <p className='page-subtitle'>Quản lý các loại văn bằng và tùy chọn thời hạn</p>
        </div>
      </div>

      <div className='card'>
        <div className='card-header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className='card-title'>Loại văn bằng</h2>
            <p className='card-subtitle'>
              {typePagination.total > 0 
                ? `Tổng cộng: ${typePagination.total} loại văn bằng • Trang ${typePagination.page}/${typePagination.totalPages}`
                : 'Quản lý các loại văn bằng và tùy chọn thời hạn'
              }
            </p>
          </div>
          <button className='btn btn-primary' onClick={() => openTypeModal()}>
            + Thêm loại văn bằng
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type='text'
              placeholder='Tìm kiếm theo tên hoặc ID...'
              value={typeSearchText}
              onChange={(e) => {
                setTypeSearchText(e.target.value)
                setTypePagination(prev => ({ ...prev, page: 1 }))
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
            <label style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>Hiển thị:</label>
            <select
              value={typeLimit}
              onChange={(e) => {
                const newLimit = Number(e.target.value)
                setTypeLimit(newLimit)
                setTypePagination(prev => ({ ...prev, page: 1 }))
                loadCredentialTypes(1, newLimit)
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

        {isLoadingTypes ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Đang tải...</div>
        ) : (
          <>
            <div className='table-container'>
            <table className='table' style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>ID</th>
                  <th style={{ width: '40%' }}>Tên</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Thời hạn</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {credentialTypes.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
                      Chưa có loại văn bằng nào
                    </td>
                  </tr>
                ) : (
                  credentialTypes.map((type) => (
                    <tr key={type.id}>
                      <td style={{ padding: '12px', wordBreak: 'break-word' }}>
                        <code style={{ fontSize: '12px' }}>{type.id}</code>
                      </td>
                      <td style={{ padding: '12px', wordBreak: 'break-word' }}>{type.name}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {type.isPermanent ? (
                          <span className='badge-soft' style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                            ✓ Vĩnh viễn
                          </span>
                        ) : (
                          <span className='badge-soft' style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                            Có thời hạn
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <IconButton
                            icon='✏️'
                            label='Sửa'
                            onClick={() => openTypeModal(type)}
                            variant='ghost'
                          />
                          <IconButton
                            icon='🗑️'
                            label='Xóa'
                            onClick={() => handleTypeDelete(type.id)}
                            variant='danger'
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {typePagination.total > 0 && (
            <div className='pagination' style={{ padding: '16px', borderTop: '1px solid #eee' }}>
              <span className='pagination-info'>
                Trang {typePagination.page} / {typePagination.totalPages} (Tổng: {typePagination.total} loại văn bằng)
              </span>
              {typePagination.totalPages > 1 && (
                <div className='pagination-actions'>
                  <button 
                    className='btn btn-ghost' 
                    onClick={() => loadCredentialTypes(typePagination.page - 1, typeLimit)} 
                    disabled={typePagination.page <= 1 || isLoadingTypes}
                  >
                    ‹ Trước
                  </button>
                  <div className='pagination-numbers'>
                    {(() => {
                      const pages: (number | string)[] = []
                      const { page: current, totalPages } = typePagination
                      
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i)
                        }
                      } else {
                        pages.push(1)
                        if (current > 3) pages.push('...')
                        const start = Math.max(2, current - 1)
                        const end = Math.min(totalPages - 1, current + 1)
                        for (let i = start; i <= end; i++) {
                          pages.push(i)
                        }
                        if (current < totalPages - 2) pages.push('...')
                        pages.push(totalPages)
                      }
                      
                      return pages.map((pageNum, idx) => {
                        if (pageNum === '...') {
                          return <span key={`ellipsis-${idx}`} className='pagination-ellipsis'>...</span>
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => loadCredentialTypes(pageNum as number, typeLimit)}
                            className={`btn ${pageNum === current ? 'btn-primary' : 'btn-ghost'} pagination-number`}
                            disabled={isLoadingTypes}
                          >
                            {pageNum}
                          </button>
                        )
                      })
                    })()}
                  </div>
                  <button 
                    className='btn btn-ghost' 
                    onClick={() => loadCredentialTypes(typePagination.page + 1, typeLimit)} 
                    disabled={typePagination.page >= typePagination.totalPages || isLoadingTypes}
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

      {/* Credential Type Modal with integrated Validity Options */}
      {showTypeModal && (
        <div className='modal-overlay' onClick={closeTypeModal}>
          <div className='modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className='modal-header'>
              <h3>{editingType ? 'Sửa loại văn bằng' : 'Thêm loại văn bằng'}</h3>
              <button className='modal-close-btn' onClick={closeTypeModal}>×</button>
            </div>
            <div className='modal-body' style={{ padding: '16px' }}>
              {/* Credential Type Form */}
              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #eee' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Thông tin loại văn bằng</h4>
                <div className='field'>
                  <label>ID *</label>
                  <input
                    type='text'
                    value={typeForm.id}
                    onChange={(e) => {
                      setTypeForm({ ...typeForm, id: e.target.value })
                      // If ID changes and not permanent, reload validity options
                      if (!typeForm.isPermanent && e.target.value) {
                        setTimeout(() => loadValidityOptionsForType(e.target.value), 300)
                      }
                    }}
                    placeholder='Nhập ID (ví dụ: vn_cccd_chip)'
                    disabled={!!editingType}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                  />
                  <small className='field-hint'>ID duy nhất, không thể thay đổi sau khi tạo</small>
                </div>
                <div className='field'>
                  <label>Tên *</label>
                  <input
                    type='text'
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    placeholder='Nhập tên loại văn bằng'
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                  />
                </div>
                <div className='field'>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                      <input
                        type='checkbox'
                        checked={typeForm.isPermanent}
                        onChange={(e) => {
                          setTypeForm({ ...typeForm, isPermanent: e.target.checked })
                          if (e.target.checked) {
                            setCurrentTypeValidityOptions([])
                          } else if (typeForm.id) {
                            loadValidityOptionsForType(typeForm.id)
                          }
                        }}
                        style={{
                          opacity: 0,
                          width: 0,
                          height: 0,
                          position: 'absolute'
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: typeForm.isPermanent ? '#059669' : '#ccc',
                          borderRadius: '24px',
                          transition: 'background-color 0.3s',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px'
                        }}
                      >
                        <span
                          style={{
                            content: '""',
                            position: 'absolute',
                            height: '20px',
                            width: '20px',
                            left: typeForm.isPermanent ? 'calc(100% - 22px)' : '2px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: 'left 0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        />
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                      Vĩnh viễn (không có thời hạn)
                    </span>
                  </label>
                </div>
              </div>

              {/* Validity Options Section - Only show if not permanent and has ID */}
              {!typeForm.isPermanent && typeForm.id && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600' }}>Tùy chọn thời hạn</h4>
                    <button 
                      className='btn btn-sm btn-primary' 
                      onClick={() => openOptionModal()}
                      disabled={!typeForm.id.trim()}
                    >
                      + Thêm tùy chọn
                    </button>
                  </div>

                  {isLoadingOptions ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>Đang tải...</div>
                  ) : currentTypeValidityOptions.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#999', background: '#f9fafb', borderRadius: '8px' }}>
                      Chưa có tùy chọn thời hạn nào. Nhấn "+ Thêm tùy chọn" để thêm.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb' }}>
                          <tr>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', borderBottom: '1px solid #eee' }}>ID</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', borderBottom: '1px solid #eee' }}>Thời hạn</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', borderBottom: '1px solid #eee' }}>Ghi chú</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', borderBottom: '1px solid #eee' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTypeValidityOptions.map((option) => (
                            <tr key={option.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '12px', fontSize: '12px' }}>
                                <code style={{ fontSize: '11px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                                  {option.id}
                                </code>
                              </td>
                              <td style={{ padding: '12px', fontWeight: '500' }}>{formatPeriod(option)}</td>
                              <td style={{ padding: '12px', color: '#666', fontSize: '13px' }}>{option.note || '-'}</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                  <IconButton
                                    icon='✏️'
                                    label='Sửa'
                                    onClick={() => openOptionModal(option)}
                                    variant='ghost'
                                  />
                                  <IconButton
                                    icon='🗑️'
                                    label='Xóa'
                                    onClick={() => handleOptionDelete(option.id)}
                                    variant='danger'
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {typeForm.isPermanent && (
                <div className='info-box' style={{ padding: '12px', background: 'rgba(5, 150, 105, 0.1)', borderRadius: '8px', marginTop: '16px' }}>
                  <small className='field-hint' style={{ color: '#059669' }}>
                    ✓ Loại văn bằng này là vĩnh viễn, không cần tùy chọn thời hạn
                  </small>
                </div>
              )}
            </div>
            <div className='modal-actions'>
              <button className='btn btn-ghost' onClick={closeTypeModal}>Hủy</button>
              <button className='btn btn-primary' onClick={handleTypeSubmit}>
                {editingType ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validity Option Modal (nested within credential type modal) */}
      {showOptionModal && (
        <div className='modal-overlay' onClick={closeOptionModal} style={{ zIndex: 2000 }}>
          <div className='modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className='modal-header'>
              <h3>{editingOption ? 'Sửa tùy chọn thời hạn' : 'Thêm tùy chọn thời hạn'}</h3>
              <button className='modal-close-btn' onClick={closeOptionModal}>×</button>
            </div>
            <div className='modal-body' style={{ padding: '16px' }}>
              <div className='field'>
                <label>ID *</label>
                <input
                  type='text'
                  value={optionForm.id}
                  onChange={(e) => setOptionForm({ ...optionForm, id: e.target.value })}
                  placeholder='Nhập ID (ví dụ: opt_passport_60)'
                  disabled={!!editingOption}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                />
                <small className='field-hint'>ID duy nhất, không thể thay đổi sau khi tạo</small>
              </div>
              <div className='form-grid'>
                <div className='field'>
                  <label>Số tháng</label>
                  <input
                    type='number'
                    value={optionForm.periodMonths}
                    onChange={(e) => setOptionForm({ ...optionForm, periodMonths: e.target.value })}
                    placeholder='Nhập số năm'
                    min='0'
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                  />
                </div>
                <div className='field'>
                  <label>Số ngày</label>
                  <input
                    type='number'
                    value={optionForm.periodDays}
                    onChange={(e) => setOptionForm({ ...optionForm, periodDays: e.target.value })}
                    placeholder='Nhập số ngày'
                    min='0'
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                  />
                </div>
              </div>
              <small className='field-hint' style={{ marginBottom: '16px', display: 'block' }}>
                Cần có ít nhất một trong hai: Số tháng hoặc Số ngày
              </small>
              <div className='field'>
                <label>Ghi chú</label>
                <input
                  type='text'
                  value={optionForm.note}
                  onChange={(e) => setOptionForm({ ...optionForm, note: e.target.value })}
                  placeholder='nhập ghi chú'
                  style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                />
              </div>
            </div>
            <div className='modal-actions'>
              <button className='btn btn-ghost' onClick={closeOptionModal}>Hủy</button>
              <button className='btn btn-primary' onClick={handleOptionSubmit}>
                {editingOption ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
