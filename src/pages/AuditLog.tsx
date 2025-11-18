import { useState, useEffect, useMemo } from 'react'
import { IconSearch, IconRefresh, IconCopy, IconCheck, IconEye, IconCalendar } from '@tabler/icons-react'
import { useAuth } from '../hooks/useAuth'
import { decodeJwt } from '../utils/jwt'
import { listAuditLogs, getAuditStats, AuditLog as AuditLogEntry, AuditLogFilters, AuditAction, AuditStatus } from '../api/audit.api'
import { usePagination } from '../hooks/usePagination'
import { formatDateShort } from '../utils/format'
import DateRangePicker from '../components/DateRangePicker'

const DEFAULT_PAGE_LIMIT = 5

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  REGISTER: 'Đăng ký',
  CERT_UPLOAD: 'Upload chứng chỉ',
  CERT_APPROVE: 'Duyệt chứng chỉ',
  CERT_REJECT: 'Từ chối chứng chỉ',
  CERT_REVOKE: 'Thu hồi chứng chỉ',
  CERT_ISSUE: 'Cấp phát chứng chỉ',
  CERT_REUPLOAD: 'Reupload chứng chỉ',
  CERT_UPDATE_EXPIRATION: 'Cập nhật thời hạn',
  CERT_TRANSFER: 'Chuyển người nhận chứng chỉ',
  USER_CREATE: 'Tạo người dùng',
  USER_UPDATE: 'Cập nhật người dùng',
  USER_DELETE: 'Xóa người dùng',
  USER_ENABLE: 'Kích hoạt người dùng',
  USER_DISABLE: 'Vô hiệu hóa người dùng',
  CREDENTIAL_TYPE_CREATE: 'Tạo loại văn bằng',
  CREDENTIAL_TYPE_UPDATE: 'Cập nhật loại văn bằng',
  CREDENTIAL_TYPE_DELETE: 'Xóa loại văn bằng',
  CREDENTIAL_VALIDITY_CREATE: 'Tạo tùy chọn thời hạn',
  CREDENTIAL_VALIDITY_UPDATE: 'Cập nhật tùy chọn thời hạn',
  CREDENTIAL_VALIDITY_DELETE: 'Xóa tùy chọn thời hạn',
  SYSTEM_CONFIG_UPDATE: 'Cập nhật cấu hình hệ thống',
}

const ACTION_SHORT_LABELS: Record<AuditAction, string> = {
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  REGISTER: 'Đăng ký',
  CERT_UPLOAD: 'Upload',
  CERT_APPROVE: 'Duyệt',
  CERT_REJECT: 'Từ chối',
  CERT_REVOKE: 'Thu hồi',
  CERT_ISSUE: 'Cấp phát',
  CERT_REUPLOAD: 'Reupload',
  CERT_UPDATE_EXPIRATION: 'Cập nhật',
  CERT_TRANSFER: 'Chuyển',
  USER_CREATE: 'Tạo user',
  USER_UPDATE: 'Sửa user',
  USER_DELETE: 'Xóa user',
  USER_ENABLE: 'Kích hoạt',
  USER_DISABLE: 'Vô hiệu hóa',
  CREDENTIAL_TYPE_CREATE: 'Tạo loại',
  CREDENTIAL_TYPE_UPDATE: 'Sửa loại',
  CREDENTIAL_TYPE_DELETE: 'Xóa loại',
  CREDENTIAL_VALIDITY_CREATE: 'Tạo tùy chọn',
  CREDENTIAL_VALIDITY_UPDATE: 'Sửa tùy chọn',
  CREDENTIAL_VALIDITY_DELETE: 'Xóa tùy chọn',
  SYSTEM_CONFIG_UPDATE: 'Cấu hình',
}

const ROLE_LABELS: Record<string, string> = {
  USER: 'User',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
}

const ROLE_SHORT_LABELS: Record<string, string> = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER',
}

export default function AuditLog() {
  const { token } = useAuth()
  
  const userRole = useMemo(() => {
    if (!token) return null
    const decoded = decodeJwt(token)
    return (decoded as any)?.role || null
  }, [token])

  const isSuperAdmin = userRole === 'SUPER_ADMIN'

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  
  const { pagination, page, limit, setPage, setLimit, updatePagination } = usePagination({ defaultLimit: DEFAULT_PAGE_LIMIT })
  const [searchText, setSearchText] = useState('')
  const [selectedUserRole, setSelectedUserRole] = useState<'USER' | 'ADMIN' | 'SUPER_ADMIN' | ''>('')
  const [selectedAction, setSelectedAction] = useState<AuditAction | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<AuditStatus | ''>('')
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [tempStartDate, setTempStartDate] = useState<string | null>(null)
  const [tempEndDate, setTempEndDate] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  const fetchLogs = async () => {
    if (!isSuperAdmin) return

    setIsLoading(true)
    setError(null)

    try {
      const filtersToSend: AuditLogFilters = {
        page,
        limit,
        search: searchText || undefined,
        userRole: selectedUserRole || undefined,
        action: selectedAction || undefined,
        status: selectedStatus || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }

      const response = await listAuditLogs(filtersToSend)
      setLogs(response.logs)
      updatePagination(response.pagination)
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tải audit logs')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!isSuperAdmin) return

    try {
      const statsData = await getAuditStats(startDate || undefined, endDate || undefined)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLogs()
      fetchStats()
    }
  }, [page, limit, searchText, selectedUserRole, selectedAction, selectedStatus, startDate, endDate, isSuperAdmin])

  // Đóng date picker khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showDatePicker && !target.closest('.date-range-picker') && !target.closest('button[type="button"]')) {
        setShowDatePicker(false)
      }
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDatePicker])

  const handleResetFilters = () => {
    setSearchText('')
    setSelectedUserRole('')
    setSelectedAction('')
    setSelectedStatus('')
    setStartDate(null)
    setEndDate(null)
    setPage(1)
  }

  const handleDateRangeChange = (start: string | null, end: string | null) => {
    // Chỉ lưu tạm, chưa apply filter
    setTempStartDate(start)
    setTempEndDate(end)
  }

  const handleApplyDateRange = () => {
    // Apply filter khi bấm nút "Chọn"
    setStartDate(tempStartDate)
    setEndDate(tempEndDate)
    setShowDatePicker(false)
  }

  const handleCancelDateRange = () => {
    // Reset về giá trị cũ khi hủy
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setShowDatePicker(false)
  }

  const getStatusBadgeClass = (status: AuditStatus) => {
    return status === 'SUCCESS' 
      ? 'status-badge success' 
      : 'status-badge danger'
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'role-badge role-badge--super-admin'
      case 'ADMIN':
        return 'role-badge role-badge--admin'
      case 'USER':
        return 'role-badge role-badge--user'
      default:
        return 'role-badge'
    }
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatResourceId = (id: string) => {
    if (id.length <= 12) return id
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`
  }

  if (!isSuperAdmin) {
    return (
      <div className='page'>
        <div className='page-header'>
          <h1 className='page-title'>Không có quyền truy cập</h1>
          <p className='page-subtitle'>Chỉ super admin mới có quyền xem audit logs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <div className='page-eyebrow'>Audit Log</div>
          <h1 className='page-title'>Nhật ký hoạt động hệ thống</h1>
          <p className='page-subtitle'>Theo dõi tất cả hành động của admin, super admin và user trong hệ thống.</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {[
            { label: 'Tổng số logs', value: stats.totalLogs.toLocaleString(), color: '#2563eb' },
            { label: 'Thành công', value: stats.statusStats.find((s: any) => s._id === 'SUCCESS')?.count || 0, color: '#10b981' },
            { label: 'Thất bại', value: stats.statusStats.find((s: any) => s._id === 'FAILURE')?.count || 0, color: '#ef4444' }
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: 'white',
              borderRadius: '8px',
              padding: '12px 16px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className='card card--subtle' style={{ padding: '16px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '12px',
          alignItems: 'end'
        }}>
          <div className='field' style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px', marginBottom: '4px' }}>Tìm kiếm</label>
            <div style={{ position: 'relative' }}>
              <input
                type='text'
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder='Email, Resource ID...'
                style={{ 
                  paddingLeft: '32px',
                  padding: '6px 8px 6px 32px',
                  fontSize: '13px'
                }}
              />
              <IconSearch size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            </div>
          </div>

          <div className='field' style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px', marginBottom: '4px' }}>Vai trò</label>
            <select 
              value={selectedUserRole} 
              onChange={(e) => setSelectedUserRole(e.target.value as any)}
              style={{ padding: '6px 8px', fontSize: '13px' }}
            >
              <option value=''>Tất cả</option>
              <option value='USER'>User</option>
              <option value='ADMIN'>Admin</option>
              <option value='SUPER_ADMIN'>Super Admin</option>
            </select>
          </div>

          <div className='field' style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px', marginBottom: '4px' }}>Hành động</label>
            <select 
              value={selectedAction} 
              onChange={(e) => setSelectedAction(e.target.value as any)}
              style={{ padding: '6px 8px', fontSize: '13px' }}
            >
              <option value=''>Tất cả</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className='field' style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px', marginBottom: '4px' }}>Trạng thái</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              style={{ padding: '6px 8px', fontSize: '13px' }}
            >
              <option value=''>Tất cả</option>
              <option value='SUCCESS'>Thành công</option>
              <option value='FAILURE'>Thất bại</option>
            </select>
          </div>

          <div className='field' style={{ marginBottom: 0, gridColumn: 'span 2', position: 'relative' }}>
            <label style={{ fontSize: '12px', marginBottom: '4px' }}>Khoảng thời gian</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <button
                type='button'
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '13px',
                  textAlign: 'left',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: startDate && endDate ? '#374151' : '#9ca3af'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {startDate && endDate 
                    ? `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}`
                    : startDate
                    ? `${new Date(startDate).toLocaleDateString('vi-VN')} - ...`
                    : 'Chọn khoảng thời gian'}
                </span>
                <IconCalendar size={16} style={{ color: '#9ca3af', flexShrink: 0, marginLeft: '8px' }} />
              </button>
              {showDatePicker && (
                <div 
                  className="date-range-picker-wrapper"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 1000,
                    marginTop: '8px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '16px',
                    width: 'max-content',
                    maxWidth: 'calc(100vw - 32px)',
                    overflow: 'hidden'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <DateRangePicker
                    startDate={tempStartDate}
                    endDate={tempEndDate}
                    onDateChange={handleDateRangeChange}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <button
                      type='button'
                      onClick={handleCancelDateRange}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#374151',
                        fontWeight: '500'
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      type='button'
                      onClick={handleApplyDateRange}
                      disabled={!tempStartDate || !tempEndDate}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        background: tempStartDate && tempEndDate ? '#2563eb' : '#9ca3af',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: tempStartDate && tempEndDate ? 'pointer' : 'not-allowed',
                        color: 'white',
                        fontWeight: '500'
                      }}
                    >
                      Chọn
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button 
              className='btn btn-ghost' 
              onClick={handleResetFilters}
              style={{ 
                padding: '6px 12px',
                fontSize: '13px',
                width: '100%'
              }}
            >
              <IconRefresh size={16} style={{ marginRight: '6px' }} />
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && <div className='alert' style={{ marginTop: '16px' }}>⚠️ {error}</div>}

      {/* Logs Table */}
      <div className='card'>
        <div className='card-header'>
          <h3 className='card-title'>Danh sách logs</h3>
        </div>
        <div className='card-body' style={{ padding: 0 }}>
          {isLoading ? (
            <div className='loading-state'>Đang tải...</div>
          ) : logs.length === 0 ? (
            <div className='empty-state'>Không có log nào</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className='data-table'>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Thời gian</th>
                    <th style={{ textAlign: 'center' }}>Người thực hiện</th>
                    <th style={{ textAlign: 'center' }}>Vai trò</th>
                    <th style={{ textAlign: 'center' }}>Hành động</th>
                    <th style={{ textAlign: 'center' }}>Resource</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>IP</th>
                    <th style={{ textAlign: 'center' }}>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>{formatDateShort(log.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '12px',
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '2px'
                            }}>
                              {log.userEmail.length > 25 ? `${log.userEmail.substring(0, 22)}...` : log.userEmail}
                            </div>
                            {log.userId && (
                              <div style={{ 
                                fontSize: '10px', 
                                color: '#9ca3af',
                                fontFamily: 'monospace',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span>{formatResourceId(log.userId)}</span>
                              </div>
                            )}
                          </div>
                          {log.userId && (
                            <button
                              onClick={() => handleCopy(log.userId, `user-${log._id}`)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                color: copiedId === `user-${log._id}` ? '#10b981' : '#9ca3af',
                                transition: 'color 0.2s',
                                flexShrink: 0
                              }}
                              title='Copy User ID'
                            >
                              {copiedId === `user-${log._id}` ? (
                                <IconCheck size={12} />
                              ) : (
                                <IconCopy size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span 
                          className={getRoleBadgeClass(log.userRole)}
                          style={{ 
                            fontSize: '11px',
                            padding: '3px 8px',
                            display: 'inline-block'
                          }}
                        >
                          {ROLE_SHORT_LABELS[log.userRole] || log.userRole}
                        </span>
                      </td>
                      <td>
                        <div style={{ 
                          fontSize: '12px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {ACTION_SHORT_LABELS[log.action] || ACTION_LABELS[log.action] || log.action}
                        </div>
                      </td>
                      <td>
                        {log.resourceType && log.resourceId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>
                                {log.resourceType}
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                fontFamily: 'monospace', 
                                color: '#374151',
                                wordBreak: 'break-all'
                              }}>
                                {formatResourceId(log.resourceId)}
                              </div>
                            </div>
                            <button
                              onClick={() => log.resourceId && handleCopy(log.resourceId, log._id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                color: copiedId === log._id ? '#10b981' : '#6b7280',
                                transition: 'color 0.2s'
                              }}
                              title='Copy Resource ID'
                            >
                              {copiedId === log._id ? (
                                <IconCheck size={14} />
                              ) : (
                                <IconCopy size={14} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span 
                          className={getStatusBadgeClass(log.status)}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            display: 'inline-block'
                          }}
                        >
                          {log.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                        </span>
                        {log.errorMessage && (
                          <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '3px', lineHeight: '1.3' }}>
                            {log.errorMessage.length > 30 ? `${log.errorMessage.substring(0, 27)}...` : log.errorMessage}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '11px',
                          color: '#6b7280'
                        }}>
                          {log.ipAddress 
                            ? (log.ipAddress.length > 18 
                                ? `${log.ipAddress.substring(0, 15)}...` 
                                : log.ipAddress)
                            : '-'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedLog(log)
                            setShowDetailsModal(true)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#2563eb',
                            padding: '6px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#eff6ff'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                          }}
                          title='Xem chi tiết'
                        >
                          <IconEye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && (
          <div className='card-footer' style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ 
                fontSize: '13px', 
                color: '#6b7280',
                fontWeight: '500'
              }}>
                {pagination.total > 0 ? (
                  <>
                    Trang <strong style={{ color: '#374151' }}>{pagination.page}</strong> / {pagination.totalPages} 
                    <span style={{ margin: '0 8px', color: '#d1d5db' }}>•</span>
                    Tổng <strong style={{ color: '#374151' }}>{pagination.total.toLocaleString()}</strong> bản ghi
                  </>
                ) : (
                  <span style={{ color: '#9ca3af' }}>Không có dữ liệu</span>
                )}
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '4px 8px',
                background: 'white',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <label style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}>
                  Hiển thị:
                </label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  disabled={isLoading}
                  style={{
                    padding: '4px 8px',
                    fontSize: '13px',
                    border: 'none',
                    borderRadius: '4px',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#374151',
                    fontWeight: '500',
                    outline: 'none'
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            {pagination.totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                gap: '6px', 
                alignItems: 'center',
                background: 'white',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <button
                  className='btn btn-ghost'
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isLoading}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '13px',
                    minWidth: 'auto',
                    border: 'none',
                    borderRadius: '6px'
                  }}
                >
                  ‹
                </button>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = pagination.page <= 3 
                      ? i + 1 
                      : pagination.page >= pagination.totalPages - 2
                      ? pagination.totalPages - 4 + i
                      : pagination.page - 2 + i
                    if (pageNum < 1 || pageNum > pagination.totalPages) return null
                    return (
                      <button
                        key={pageNum}
                        className={`btn ${pageNum === pagination.page ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPage(pageNum)}
                        disabled={isLoading}
                        style={{ 
                          minWidth: '36px', 
                          padding: '6px 8px', 
                          fontSize: '13px',
                          fontWeight: pageNum === pagination.page ? '600' : '400',
                          border: 'none',
                          borderRadius: '6px'
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  className='btn btn-ghost'
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '13px',
                    minWidth: 'auto',
                    border: 'none',
                    borderRadius: '6px'
                  }}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div 
          className='modal-overlay' 
          onClick={() => {
            setShowDetailsModal(false)
            setSelectedLog(null)
            setCopiedId(null)
          }}
        >
          <div className='modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div className='modal-header'>
              <h3>Chi tiết Audit Log</h3>
              <button 
                className='modal-close-btn' 
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedLog(null)
                  setCopiedId(null)
                }} 
                aria-label='Đóng'
              >
                ×
              </button>
            </div>
            <div className='modal-body' style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Thời gian */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Thời gian</div>
                  <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                    {new Date(selectedLog.createdAt).toLocaleString('vi-VN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                </div>

                {/* Người thực hiện */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Người thực hiện</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '4px' }}>
                        {selectedLog.userEmail}
                      </div>
                      {selectedLog.userId && (
                        <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                          ID: {formatResourceId(selectedLog.userId)}
                        </div>
                      )}
                    </div>
                    {selectedLog.userId && (
                      <button
                        onClick={() => handleCopy(selectedLog.userId, `modal-user-${selectedLog._id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          color: copiedId === `modal-user-${selectedLog._id}` ? '#10b981' : '#6b7280',
                          transition: 'color 0.2s'
                        }}
                        title='Copy User ID'
                      >
                        {copiedId === `modal-user-${selectedLog._id}` ? (
                          <IconCheck size={16} />
                        ) : (
                          <IconCopy size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Vai trò */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Vai trò</div>
                  <span className={getRoleBadgeClass(selectedLog.userRole)}>
                    {ROLE_LABELS[selectedLog.userRole] || selectedLog.userRole}
                  </span>
                </div>

                {/* Hành động */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Hành động</div>
                  <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                    {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                  </div>
                </div>

                {/* Resource */}
                {selectedLog.resourceType && selectedLog.resourceId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Resource</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginBottom: '4px' }}>
                          {selectedLog.resourceType}
                        </div>
                        <div style={{ fontSize: '12px', color: '#374151', fontFamily: 'monospace' }}>
                          {formatResourceId(selectedLog.resourceId)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(selectedLog.resourceId!, `modal-resource-${selectedLog._id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          color: copiedId === `modal-resource-${selectedLog._id}` ? '#10b981' : '#6b7280',
                          transition: 'color 0.2s'
                        }}
                        title='Copy Resource ID'
                      >
                        {copiedId === `modal-resource-${selectedLog._id}` ? (
                          <IconCheck size={16} />
                        ) : (
                          <IconCopy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Trạng thái */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Trạng thái</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className={getStatusBadgeClass(selectedLog.status)}>
                      {selectedLog.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                    </span>
                    {selectedLog.errorMessage && (
                      <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', textAlign: 'right', maxWidth: '300px' }}>
                        {selectedLog.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* IP Address */}
                {selectedLog.ipAddress && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>IP Address</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#374151' }}>
                        {selectedLog.ipAddress}
                      </span>
                      <button
                        onClick={() => handleCopy(selectedLog.ipAddress!, `modal-ip-${selectedLog._id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          color: copiedId === `modal-ip-${selectedLog._id}` ? '#10b981' : '#6b7280',
                          transition: 'color 0.2s'
                        }}
                        title='Copy IP Address'
                      >
                        {copiedId === `modal-ip-${selectedLog._id}` ? (
                          <IconCheck size={16} />
                        ) : (
                          <IconCopy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* User Agent */}
                {selectedLog.userAgent && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>User Agent</div>
                    <div style={{ fontSize: '12px', color: '#374151', maxWidth: '400px', wordBreak: 'break-word', textAlign: 'right' }}>
                      {selectedLog.userAgent}
                    </div>
                  </div>
                )}

                {/* Details JSON */}
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div style={{ paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Chi tiết (JSON)</div>
                      <button
                        onClick={() => handleCopy(JSON.stringify(selectedLog.details, null, 2), `modal-details-${selectedLog._id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: copiedId === `modal-details-${selectedLog._id}` ? '#10b981' : '#2563eb',
                          fontSize: '12px',
                          borderRadius: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#eff6ff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none'
                        }}
                        title='Copy JSON'
                      >
                        {copiedId === `modal-details-${selectedLog._id}` ? (
                          <>
                            <IconCheck size={14} />
                            <span>Đã copy</span>
                          </>
                        ) : (
                          <>
                            <IconCopy size={14} />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre style={{ 
                      margin: 0,
                      padding: '12px', 
                      background: '#f9fafb', 
                      borderRadius: '6px',
                      fontSize: '12px',
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      lineHeight: '1.6',
                      border: '1px solid #e5e7eb',
                      maxHeight: '300px'
                    }}>
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            <div className='modal-actions'>
              <button 
                className='btn btn-primary' 
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedLog(null)
                  setCopiedId(null)
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

