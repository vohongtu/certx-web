import { useState, useEffect, useRef, useCallback } from 'react'
import { listUsers, UserSummary } from '../api/users.api'

interface UserSelectorProps {
  value?: string // userId
  onChange: (userId: string | null, userName: string) => void
  placeholder?: string
  className?: string
}

export default function UserSelector({
  value,
  onChange,
  placeholder = 'Chọn người nhận (tùy chọn)...',
  className = ''
}: UserSelectorProps) {
  const [showModal, setShowModal] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [users, setUsers] = useState<UserSummary[]>([])
  const [allUsers, setAllUsers] = useState<UserSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const loadUsers = useCallback(async (searchQuery?: string, page: number = 1, append: boolean = false) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listUsers({
        q: searchQuery || undefined,
        page,
        limit: 50 // Load 50 users mỗi lần
      })
      
      setTotalItems(response.pagination?.total || 0)
      setHasMore(page < (response.pagination?.totalPages || 1))
      
      if (page === 1 || !append) {
        setAllUsers(response.items)
        setUsers(response.items)
        setCurrentPage(1)
      } else {
        setAllUsers(prev => [...prev, ...response.items])
        setUsers(prev => [...prev, ...response.items])
      }
      
      setCurrentPage(page)
      return response
    } catch (error: any) {
      console.error('Error loading users:', error)
      setError(error.message || 'Không thể tải danh sách người dùng')
      if (!append) {
        setAllUsers([])
        setUsers([])
      }
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load users khi mở modal
  useEffect(() => {
    if (showModal) {
      setSearchText('')
      setCurrentPage(1)
      setHasMore(true)
      loadUsers(undefined, 1, false)
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [showModal, loadUsers])

  // Load selected user nếu có value
  useEffect(() => {
    if (value && !selectedUser && allUsers.length > 0) {
      const found = allUsers.find(u => u.id === value)
      if (found) {
        setSelectedUser(found)
      }
    }
  }, [value, allUsers, selectedUser])

  // Debounce search và gọi API khi search text thay đổi
  useEffect(() => {
    if (!showModal) return
    
    const timer = setTimeout(() => {
      if (searchText && searchText.trim()) {
        setCurrentPage(1)
        setHasMore(true)
        loadUsers(searchText.trim(), 1, false)
      } else {
        setCurrentPage(1)
        setHasMore(true)
        loadUsers(undefined, 1, false)
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchText, showModal, loadUsers])
  
  // Infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
    
    if (scrollBottom < 50 && hasMore && !isLoading && !searchText) {
      loadUsers(undefined, currentPage + 1, true)
    }
  }, [hasMore, isLoading, searchText, currentPage, loadUsers])

  const handleSelect = (user: UserSummary) => {
    setSelectedUser(user)
    onChange(user.id, user.name)
    setSearchText('')
    setShowModal(false)
  }

  const handleClear = () => {
    setSelectedUser(null)
    onChange(null, '')
    setSearchText('')
  }

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false)
      }
    }

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showModal])

  return (
    <div className={`user-selector ${className}`} style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          background: '#fff',
          minHeight: '38px'
        }}
        onClick={() => setShowModal(true)}
      >
        {selectedUser ? (
          <>
            <span style={{ flex: 1, textAlign: 'left' }}>
              {selectedUser.name} ({selectedUser.email})
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#999',
                fontSize: '18px',
                lineHeight: '1'
              }}
              title="Xóa"
            >
              ×
            </button>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: 'left', color: '#999' }}>{placeholder}</span>
        )}
        <span style={{ color: '#999' }}>▼</span>
      </div>

      {showModal && (
        <div
          ref={modalRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Search input */}
          <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm kiếm theo tên hoặc email..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* User list */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{
              overflowY: 'auto',
              maxHeight: '300px',
              padding: '4px 0'
            }}
          >
            {isLoading && users.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                Đang tải...
              </div>
            ) : error ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
                {error}
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                {searchText ? 'Không tìm thấy người dùng' : 'Không có người dùng nào'}
              </div>
            ) : (
              <>
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      background: selectedUser?.id === user.id ? '#eff6ff' : '#fff',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedUser?.id !== user.id) {
                        e.currentTarget.style.background = '#f9fafb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = selectedUser?.id === user.id ? '#eff6ff' : '#fff'
                    }}
                  >
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>{user.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                    {user.role && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        {user.role === 'USER' ? 'Người dùng' : user.role === 'ADMIN' ? 'Admin' : 'Super Admin'}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && users.length > 0 && (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                    Đang tải thêm...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

