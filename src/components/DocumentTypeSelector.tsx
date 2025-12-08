import { useState, useEffect, useRef, useCallback } from 'react'
import { listCredentialTypes, CredentialType } from '../api/credential-types.api'

interface DocumentTypeSelectorProps {
  value?: string // documentTypeId hoặc degree (backward compatible)
  onChange: (documentTypeId: string | null, degreeName: string) => void
  placeholder?: string
  allowCustom?: boolean // Cho phép nhập tùy chỉnh nếu không tìm thấy
  className?: string
}

export default function DocumentTypeSelector({
  value,
  onChange,
  placeholder = 'Chọn loại văn bằng/chứng chỉ...',
  allowCustom = true,
  className = ''
}: DocumentTypeSelectorProps) {
  const [showModal, setShowModal] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [documentTypes, setDocumentTypes] = useState<CredentialType[]>([])
  const [allDocumentTypes, setAllDocumentTypes] = useState<CredentialType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<CredentialType | null>(null)
  const [customDegree, setCustomDegree] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const loadDocumentTypes = useCallback(async (searchQuery?: string, page: number = 1, append: boolean = false) => {
    setIsLoading(true)
    setError(null)
    try {
      // Load với limit lớn để lấy nhiều items
      const response = await listCredentialTypes({ 
        q: searchQuery || undefined,
        page,
        limit: 100 // Load 100 items mỗi lần
      })
      
      setTotalItems(response.total || 0)
      setHasMore(page < (response.pagination?.totalPages || 1))
      
      if (page === 1 || !append) {
        // Trang đầu tiên hoặc không append - replace toàn bộ
        setAllDocumentTypes(response.items)
        setDocumentTypes(response.items)
        setCurrentPage(1)
      } else {
        // Trang tiếp theo - append vào danh sách
        setAllDocumentTypes(prev => [...prev, ...response.items])
        setDocumentTypes(prev => [...prev, ...response.items])
      }
      
      setCurrentPage(page)
      return response
    } catch (error: any) {
      console.error('Error loading credential types:', error)
      setError(error.message || 'Không thể tải danh sách loại văn bằng')
      if (!append) {
        setAllDocumentTypes([])
        setDocumentTypes([])
      }
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load tất cả document types khi mở modal (delay để tránh giật)
  useEffect(() => {
    if (showModal) {
      setSearchText('') // Reset search khi mở modal
      setCurrentPage(1)
      setHasMore(true)
      // Delay nhỏ để modal render xong trước khi load data (tránh giật)
      const loadTimer = setTimeout(() => {
        loadDocumentTypes(undefined, 1, false) // Load trang đầu tiên
      }, 150)
      // Focus vào input search sau khi modal mở
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 200)
      
      return () => clearTimeout(loadTimer)
    }
  }, [showModal, loadDocumentTypes])

  // Load selected type nếu có value
  useEffect(() => {
    if (value && !selectedType && allDocumentTypes.length > 0) {
      // Nếu value là documentTypeId, tìm trong danh sách
      const found = allDocumentTypes.find(dt => dt.id === value)
      if (found) {
        setSelectedType(found)
      } else if (value && allowCustom) {
        // Giả sử là custom degree
        setCustomDegree(value)
      }
    }
  }, [value, allDocumentTypes])

  // Debounce search và gọi API khi search text thay đổi
  useEffect(() => {
    if (!showModal) return
    
    const timer = setTimeout(() => {
      if (searchText && searchText.trim()) {
        // Gọi API với search query để search trên backend
        setCurrentPage(1)
        setHasMore(true)
        loadDocumentTypes(searchText.trim(), 1, false)
      } else {
        // Nếu không có search, reload tất cả
        setCurrentPage(1)
        setHasMore(true)
        loadDocumentTypes(undefined, 1, false)
      }
    }, 300) // Debounce 300ms
    
    return () => clearTimeout(timer)
  }, [searchText, showModal, loadDocumentTypes])
  
  // Infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
    
    // Load thêm khi scroll gần đến cuối (50px)
    if (scrollBottom < 50 && hasMore && !isLoading && !searchText) {
      loadDocumentTypes(undefined, currentPage + 1, true)
    }
  }, [hasMore, isLoading, searchText, currentPage, loadDocumentTypes])

  const handleSelect = (docType: CredentialType) => {
    setSelectedType(docType)
    setCustomDegree('')
    onChange(docType.id, docType.name)
    setSearchText('') // Reset search trước khi đóng
    setShowModal(false)
  }

  const handleCustomInput = () => {
    if (customDegree.trim()) {
      onChange(null, customDegree.trim())
      setSelectedType(null)
      setSearchText('') // Reset search trước khi đóng
      setShowModal(false)
    }
  }

  const handleClear = () => {
    setSelectedType(null)
    setCustomDegree('')
    onChange(null, '')
  }

  const displayValue = selectedType ? selectedType.name : (customDegree || value || '')

  return (
    <>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '6px 10px',
            cursor: 'pointer',
            background: '#fff',
            minHeight: '36px',
            fontSize: '14px'
          }}
          onClick={() => setShowModal(true)}
          className={className}
        >
          <span style={{ flex: 1, color: displayValue ? '#000' : '#999', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayValue || placeholder}
          </span>
          {displayValue && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0',
                lineHeight: '1',
                color: '#999',
                flexShrink: 0
              }}
              title="Xóa"
            >
              ×
            </button>
          )}
          <span style={{ color: '#999', fontSize: '12px', flexShrink: 0 }}>▼</span>
        </div>
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === modalRef.current || modalRef.current?.contains(e.target as Node)) {
              return
            }
            setSearchText('') // Reset search khi đóng
            setShowModal(false)
          }}
        >
          <div
            ref={modalRef}
            className="modal"
            style={{ 
              maxWidth: '600px', 
              width: '90vw', 
              height: '800px', // Fixed height để tránh giật, đủ để hiển thị 5 văn bằng
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3>Chọn loại văn bằng/chứng chỉ</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setSearchText('') // Reset search khi đóng
                  setShowModal(false)
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ 
              padding: '16px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0
            }}>
              {/* Search input - Fixed height */}
              <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Tìm kiếm loại văn bằng/chứng chỉ..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Error state - Fixed height */}
              {error && (
                <div style={{ 
                  padding: '12px', 
                  background: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '4px', 
                  color: '#dc2626',
                  marginBottom: '16px',
                  flexShrink: 0
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Content area - Flexible, fixed height container */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden'
              }}>
                {/* Loading state */}
                {isLoading && documentTypes.length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    color: '#999',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    Đang tải...
                  </div>
                )}

                {/* Empty state khi không có dữ liệu và không loading và không search */}
                {!isLoading && !error && !searchText && documentTypes.length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    color: '#999',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    Chưa có dữ liệu loại văn bằng. Vui lòng chạy seed script.
                  </div>
                )}

                {/* Document types list - Fixed height container */}
                {!isLoading && !error && documentTypes.length > 0 && (
                  <div
                    ref={listRef}
                    onScroll={handleScroll}
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      border: '1px solid #eee',
                      borderRadius: '4px',
                      minHeight: 0
                    }}
                  >
                  {documentTypes.map((docType) => (
                    <div
                      key={docType.id}
                      onClick={() => handleSelect(docType)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f5f5'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {docType.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {docType.isPermanent ? (
                            <span style={{ color: '#059669' }}>Vĩnh viễn</span>
                          ) : (
                            <span>Có thời hạn</span>
                          )}
                        </div>
                      </div>
                      {selectedType?.id === docType.id && (
                        <span style={{ color: '#2563eb', fontSize: '18px' }}>✓</span>
                      )}
                    </div>
                  ))}
                  
                  {/* Loading indicator khi load thêm */}
                  {isLoading && documentTypes.length > 0 && (
                    <div style={{ textAlign: 'center', padding: '12px', color: '#999', fontSize: '14px' }}>
                      Đang tải thêm...
                    </div>
                  )}
                  </div>
                )}

                {/* Thông tin số lượng - Đặt ở dưới cùng của content area */}
                {!isLoading && !error && documentTypes.length > 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '12px', 
                    color: '#666', 
                    fontSize: '12px',
                    borderTop: '1px solid #eee',
                    background: '#f9fafb',
                    flexShrink: 0,
                    marginTop: '8px'
                  }}>
                    Hiển thị {documentTypes.length} / {totalItems} loại văn bằng
                    {hasMore && !searchText && ' (cuộn xuống để xem thêm)'}
                  </div>
                )}

                {/* No results khi search */}
                {!isLoading && !error && searchText && documentTypes.length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    color: '#999',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    Không tìm thấy kết quả cho "{searchText}"
                  </div>
                )}
              </div>

              {/* Custom input option - Fixed at bottom */}
              {allowCustom && (
                <div style={{ 
                  marginTop: '16px', 
                  paddingTop: '16px', 
                  borderTop: '1px solid #eee',
                  flexShrink: 0
                }}>
                  <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Hoặc nhập tùy chỉnh:
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nhập tên văn bằng/chứng chỉ..."
                      value={customDegree}
                      onChange={(e) => setCustomDegree(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomInput()
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCustomInput}
                      disabled={!customDegree.trim()}
                    >
                      Chọn
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ flexShrink: 0 }}>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setSearchText('') // Reset search khi đóng
                  setShowModal(false)
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

