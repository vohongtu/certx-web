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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const loadDocumentTypes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listCredentialTypes() // Load tất cả, không truyền search
      setAllDocumentTypes(response.items)
      setDocumentTypes(response.items) // Hiển thị tất cả ban đầu
    } catch (error: any) {
      console.error('Error loading credential types:', error)
      setError(error.message || 'Không thể tải danh sách loại văn bằng')
      setAllDocumentTypes([])
      setDocumentTypes([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load tất cả document types khi mở modal
  useEffect(() => {
    if (showModal) {
      setSearchText('') // Reset search khi mở modal
      loadDocumentTypes() // Load tất cả, không cần search
      // Focus vào input search sau khi modal mở
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
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


  // Hàm loại bỏ dấu tiếng Việt
  const removeVietnameseTones = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
  }

  // Filter document types khi search text thay đổi
  useEffect(() => {
    if (showModal) {
      if (searchText && searchText.trim()) {
        // Filter danh sách đã load - hỗ trợ search không dấu
        const searchTerm = removeVietnameseTones(searchText.trim())
        const filtered = allDocumentTypes.filter(dt => {
          const nameNormalized = removeVietnameseTones(dt.name)
          const nameOriginal = dt.name.toLowerCase()
          const searchLower = searchText.toLowerCase().trim()
          
          // Tìm kiếm theo cả tên có dấu và không dấu
          return nameNormalized.includes(searchTerm) || nameOriginal.includes(searchLower)
        })
        setDocumentTypes(filtered)
      } else {
        // Hiển thị tất cả nếu không có search
        setDocumentTypes(allDocumentTypes)
      }
    }
  }, [searchText, showModal, allDocumentTypes])

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
            style={{ maxWidth: '600px', width: '90vw', maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
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
            <div className="modal-body" style={{ padding: '16px' }}>
              {/* Search input */}
              <div style={{ marginBottom: '16px' }}>
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

              {/* Error state */}
              {error && (
                <div style={{ 
                  padding: '12px', 
                  background: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '4px', 
                  color: '#dc2626',
                  marginBottom: '16px'
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  Đang tải...
                </div>
              )}

              {/* Empty state khi không có dữ liệu và không loading */}
              {!isLoading && !error && allDocumentTypes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  Chưa có dữ liệu loại văn bằng. Vui lòng chạy seed script.
                </div>
              )}

              {/* Document types list */}
              {!isLoading && !error && documentTypes.length > 0 && (
                <div
                  style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid #eee',
                    borderRadius: '4px'
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
                </div>
              )}

              {/* No results khi search */}
              {!isLoading && !error && searchText && allDocumentTypes.length > 0 && documentTypes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  Không tìm thấy kết quả cho "{searchText}"
                </div>
              )}

              {/* Custom input option */}
              {allowCustom && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
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
            <div className="modal-actions">
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

