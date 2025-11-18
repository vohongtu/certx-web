import { useState, useEffect, useMemo } from 'react'
import { IconPencil, IconTrash, IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import IconButton from '../components/IconButton'
import { getIconColor } from '../utils/iconColors'
import { UserSummary, UserListResponse, listUsers, createUser, updateUser, deleteUser, UserRole } from '../api/users.api'
import { useAuth } from '../hooks/useAuth'
import { decodeJwt } from '../utils/jwt'

const DEFAULT_PAGE_LIMIT = 10

export default function UserManage() {
  const { token } = useAuth()
  
  const currentUserInfo = useMemo(() => {
    if (!token) return { role: null, id: null }
    const decoded = decodeJwt(token)
    return { 
      role: (decoded as any)?.role || null,
      id: (decoded as any)?.sub || null
    }
  }, [token])
  
  const isSuperAdmin = currentUserInfo.role === 'SUPER_ADMIN'
  
  // Users state
  const [users, setUsers] = useState<UserSummary[]>([])
  const [userPagination, setUserPagination] = useState({ page: 1, limit: DEFAULT_PAGE_LIMIT, total: 0, totalPages: 1 })
  const [userSearchText, setUserSearchText] = useState('')
  const [userAppliedSearch, setUserAppliedSearch] = useState('')
  const [userLimit, setUserLimit] = useState(DEFAULT_PAGE_LIMIT)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', address: '', role: 'USER' as UserRole, enabled: true })

  // Fetch users
  const fetchUsers = async (page?: number, limit?: number) => {
    const requestedPage = page ?? userPagination.page
    const requestedLimit = limit ?? userLimit
    setIsLoadingUsers(true)
    setUserError(null)
    try {
      const response: UserListResponse = await listUsers({
        page: requestedPage,
        limit: requestedLimit,
        q: userAppliedSearch || undefined,
      })
      setUsers(response.items)
      setUserPagination(response.pagination)
    } catch (err: any) {
      setUserError(err.message || 'Không thể tải danh sách users')
    } finally {
      setIsLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchUsers(1, userLimit)
  }, [userAppliedSearch, userLimit])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setUserAppliedSearch(userSearchText)
      setUserPagination(prev => ({ ...prev, page: 1 }))
    }, 500)
    return () => clearTimeout(timer)
  }, [userSearchText])

  // Toggle enabled status
  const handleToggleEnabled = async (userId: string, currentEnabled: boolean) => {
    setTogglingUserId(userId)
    try {
      await updateUser(userId, { enabled: !currentEnabled })
      // Refresh danh sách
      await fetchUsers(userPagination.page, userLimit)
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật trạng thái user')
    } finally {
      setTogglingUserId(null)
    }
  }

  // Create/Update user
  const handleSaveUser = async () => {
    // Validate: Nếu tạo ADMIN hoặc SUPER_ADMIN thì phải có address
    if (!editingUser && (userForm.role === 'ADMIN' || userForm.role === 'SUPER_ADMIN') && !userForm.address.trim()) {
      alert(`Tài khoản ${userForm.role === 'SUPER_ADMIN' ? 'super admin' : 'admin'} cần có địa chỉ ETH`)
      return
    }
    
    setIsSaving(true)
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userForm)
      } else {
        // Khi tạo user, không gửi address nếu role là USER
        const userData = userForm.role === 'USER' 
          ? { ...userForm, address: undefined }
          : userForm
        await createUser(userData)
      }
      
      // Reset form và đóng modal
      setEditingUser(null)
      setUserForm({ 
        email: '', 
        password: '', 
        name: '', 
        address: '', 
        role: 'USER', 
        enabled: true 
      })
      setShowUserModal(false)
      
      // Refresh danh sách - nếu tạo mới, quay về trang 1 để thấy user mới
      if (!editingUser) {
        await fetchUsers(1, userLimit)
      } else {
        await fetchUsers(userPagination.page, userLimit)
      }
    } catch (err: any) {
      alert(err.message || 'Không thể lưu user')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete user
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa user này?')) return
    try {
      await deleteUser(id)
      // Nếu xóa user ở trang cuối và trang đó chỉ còn 1 user, quay về trang trước
      const newPage = userPagination.page > 1 && users.length === 1 
        ? userPagination.page - 1 
        : userPagination.page
      fetchUsers(newPage, userLimit)
    } catch (err: any) {
      alert(err.message || 'Không thể xóa user')
    }
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <h1 className='page-title'>Quản lý Người dùng</h1>
          <p className='page-subtitle'>Quản lý tài khoản người dùng và quản trị viên</p>
        </div>
      </div>

      <div className='card'>
        <div className='card-header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className='card-title'>Quản lý users</h2>
            <p className='card-subtitle'>
              {userPagination.total > 0 
                ? `Tổng cộng: ${userPagination.total} người dùng • Trang ${userPagination.page}/${userPagination.totalPages}`
                : (isSuperAdmin ? 'Thêm, sửa, deactive users và admins.' : 'Thêm, sửa, deactive users.')
              }
            </p>
          </div>
          <button className='btn btn-primary' onClick={() => { 
            // Reset form hoàn toàn khi mở modal thêm mới
            setEditingUser(null)
            setUserForm({ 
              email: '', 
              password: '', 
              name: '', 
              address: '', 
              role: 'USER', 
              enabled: true 
            })
            setShowUserModal(true) 
          }}>
            {isSuperAdmin ? 'Thêm tài khoản' : 'Thêm user'}
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type='text'
              placeholder='Tìm theo email, tên...'
              value={userSearchText}
              onChange={(e) => {
                setUserSearchText(e.target.value)
                setUserPagination(prev => ({ ...prev, page: 1 }))
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
              value={userLimit}
              onChange={(e) => {
                const newLimit = Number(e.target.value)
                setUserLimit(newLimit)
                setUserPagination(prev => ({ ...prev, page: 1 }))
                fetchUsers(1, newLimit)
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

        {userError && <div className='alert'>⚠️ {userError}</div>}
        {isLoadingUsers ? (
          <div className='loading-state'>Đang tải...</div>
        ) : users.length === 0 ? (
          <div className='empty-state'>Không có user nào.</div>
        ) : (
          <>
            <div className='table-wrapper'>
              <table className='data-table'>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Email</th>
                    <th style={{ textAlign: 'center' }}>Tên</th>
                    <th style={{ textAlign: 'center' }}>Role</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '13px' }}>{user.email}</td>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '13px' }}>{user.name}</td>
                      <td style={{ textAlign: 'center', padding: '8px' }}>
                        <span 
                          className={
                            user.role === 'SUPER_ADMIN' ? 'role-badge role-badge--super-admin' :
                            user.role === 'ADMIN' ? 'role-badge role-badge--admin' :
                            user.role === 'USER' ? 'role-badge role-badge--user' :
                            'role-badge'
                          }
                          style={{ fontSize: '12px', fontWeight: '600' }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px', verticalAlign: 'middle' }}>
                        <button
                          onClick={() => handleToggleEnabled(user.id, user.enabled)}
                          disabled={togglingUserId === user.id}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: togglingUserId === user.id ? 'wait' : 'pointer',
                            padding: '0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            transition: 'opacity 0.2s'
                          }}
                          title={user.enabled ? 'Click để deactive' : 'Click để active'}
                        >
                          {togglingUserId === user.id ? (
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>...</span>
                          ) : user.enabled ? (
                            <IconCircleCheck size={24} color='#10b981' strokeWidth={2.5} />
                          ) : (
                            <IconCircleX size={24} color='#ef4444' strokeWidth={2.5} />
                          )}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <IconButton
                            icon={<IconPencil size={16} />}
                            label='Sửa'
                            iconColor={getIconColor('edit')}
                            onClick={() => { 
                              setEditingUser(user)
                              setUserForm({ 
                                email: user.email, 
                                password: '', 
                                name: user.name, 
                                address: user.address || '', 
                                role: user.role, 
                                enabled: user.enabled ?? true 
                              })
                              setShowUserModal(true) 
                            }}
                            variant='ghost'
                          />
                          <IconButton
                            icon={<IconTrash size={16} />}
                            label='Xóa'
                            iconColor={getIconColor('delete')}
                            onClick={() => handleDeleteUser(user.id)}
                            variant='danger'
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination for Users */}
            {userPagination.total > 0 && (
              <div className='pagination' style={{ padding: '16px', borderTop: '1px solid #eee' }}>
                <span className='pagination-info'>
                  Trang {userPagination.page} / {userPagination.totalPages} (Tổng: {userPagination.total} người dùng)
                </span>
                {userPagination.totalPages > 1 && (
                  <div className='pagination-actions'>
                    <button 
                      className='btn btn-ghost' 
                      onClick={() => fetchUsers(userPagination.page - 1, userLimit)} 
                      disabled={userPagination.page <= 1 || isLoadingUsers}
                    >
                      ‹ Trước
                    </button>
                    <div className='pagination-numbers'>
                      {(() => {
                        const pages: (number | string)[] = []
                        const { page: current, totalPages } = userPagination
                        
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
                              className={`btn ${pageNum === current ? 'btn-primary' : 'btn-ghost'} pagination-number`}
                              onClick={() => fetchUsers(pageNum as number, userLimit)}
                              disabled={isLoadingUsers}
                            >
                              {pageNum}
                            </button>
                          )
                        })
                      })()}
                    </div>
                    <button 
                      className='btn btn-ghost' 
                      onClick={() => fetchUsers(userPagination.page + 1, userLimit)} 
                      disabled={userPagination.page >= userPagination.totalPages || isLoadingUsers}
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

      {/* User Modal */}
      {showUserModal && (
        <div className='modal-overlay' onClick={() => {
          // Reset form khi đóng modal
          setEditingUser(null)
          setUserForm({ email: '', password: '', name: '', address: '', role: 'USER', enabled: true })
          setShowUserModal(false)
        }}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>{editingUser ? 'Sửa tài khoản' : (isSuperAdmin ? 'Thêm tài khoản' : 'Thêm user')}</h3>
              <button 
                className='modal-close-btn' 
                onClick={() => {
                  setEditingUser(null)
                  setUserForm({ email: '', password: '', name: '', address: '', role: 'USER', enabled: true })
                  setShowUserModal(false)
                }}
                aria-label='Đóng'
              >
                ×
              </button>
            </div>
            <div className='modal-body'>
              <div className='field'>
                <label htmlFor='user-email'>Email *</label>
                <input 
                  id='user-email'
                  type='email' 
                  value={userForm.email} 
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} 
                  placeholder='user@example.com'
                  required 
                  disabled={!!editingUser}
                  autoComplete='off'
                />
              </div>
              <div className='field'>
                <label htmlFor='user-name'>Tên *</label>
                <input 
                  id='user-name'
                  type='text' 
                  value={userForm.name} 
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} 
                  placeholder='Tên đầy đủ'
                  required
                  autoComplete='off'
                />
              </div>
              {(isSuperAdmin || !editingUser) && (
                <div className='field'>
                  <label htmlFor='user-role'>Vai trò *</label>
                  <select 
                    id='user-role'
                    value={userForm.role} 
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole
                      setUserForm({ 
                        ...userForm, 
                        role: newRole,
                        // Reset address khi chuyển từ ADMIN/SUPER_ADMIN sang USER
                        address: newRole === 'USER' ? '' : userForm.address
                      })
                    }}
                    disabled={!isSuperAdmin || !!(editingUser && editingUser.role === 'SUPER_ADMIN' && editingUser.id !== currentUserInfo.id)}
                  >
                    <option value='USER'>User - Người dùng</option>
                    {isSuperAdmin && <option value='ADMIN'>Admin - Quản trị viên</option>}
                    {isSuperAdmin && <option value='SUPER_ADMIN'>Super Admin - Quản trị viên cấp cao</option>}
                  </select>
                  {!isSuperAdmin && !editingUser && (
                    <small className='field-hint'>Admin chỉ có thể tạo tài khoản User</small>
                  )}
                  {isSuperAdmin && editingUser && editingUser.role === 'SUPER_ADMIN' && editingUser.id !== currentUserInfo.id && (
                    <small className='field-hint text-muted'>⚠️ Bạn không thể sửa super admin khác</small>
                  )}
                </div>
              )}
              {(userForm.role === 'ADMIN' || userForm.role === 'SUPER_ADMIN') && (
                <div className='field'>
                  <label htmlFor='user-address'>Địa chỉ ETH *</label>
                  <input 
                    id='user-address'
                    type='text' 
                    value={userForm.address} 
                    onChange={(e) => setUserForm({ ...userForm, address: e.target.value })} 
                    placeholder='0x...'
                    required={userForm.role === 'ADMIN' || userForm.role === 'SUPER_ADMIN'}
                    autoComplete='off'
                  />
                  <small className='field-hint'>
                    Tài khoản {userForm.role === 'SUPER_ADMIN' ? 'super admin' : 'admin'} cần có địa chỉ ETH để cấp phát chứng chỉ
                  </small>
                </div>
              )}
              {editingUser && (editingUser.role === 'ADMIN' || editingUser.role === 'SUPER_ADMIN') && (userForm.role === 'USER') && (
                <div className='field'>
                  <div className='info-box'>
                    <small className='field-hint'>
                      ℹ️ Khi chuyển từ {editingUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'} sang User, địa chỉ ETH sẽ bị xóa
                    </small>
                  </div>
                </div>
              )}
              {userForm.role === 'USER' && !editingUser && (
                <div className='field'>
                  <div className='info-box'>
                    <small className='field-hint text-muted'>
                      ℹ️ Tài khoản user không cần địa chỉ ETH vì không trực tiếp cấp phát chứng chỉ
                    </small>
                  </div>
                </div>
              )}
              {!editingUser && (
                <div className='field'>
                  <label htmlFor='user-password'>Mật khẩu *</label>
                  <input 
                    id='user-password'
                    type='password' 
                    value={userForm.password} 
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} 
                    placeholder='Nhập mật khẩu'
                    required
                    autoComplete='new-password'
                  />
                  <small className='field-hint'>Mật khẩu tối thiểu 6 ký tự</small>
                </div>
              )}
              <div className='field'>
                <label className='checkbox-label'>
                  <input 
                    type='checkbox' 
                    checked={userForm.enabled} 
                    onChange={(e) => setUserForm({ ...userForm, enabled: e.target.checked })} 
                  />
                  <span>Tài khoản hoạt động</span>
                </label>
                <small className='field-hint'>Tài khoản bị deactive sẽ không thể đăng nhập</small>
              </div>
            </div>
            <div className='modal-actions'>
              <button 
                className='btn btn-ghost' 
                onClick={() => {
                  setEditingUser(null)
                  setUserForm({ email: '', password: '', name: '', address: '', role: 'USER', enabled: true })
                  setShowUserModal(false)
                }}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button 
                className='btn btn-primary' 
                onClick={handleSaveUser}
                disabled={isSaving}
              >
                {isSaving 
                  ? (editingUser ? 'Đang cập nhật...' : 'Đang tạo...')
                  : (editingUser ? 'Cập nhật' : 'Tạo tài khoản')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

