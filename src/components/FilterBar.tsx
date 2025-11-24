import { ChangeEvent } from 'react'
import { CertStatus } from '../api/certs.api'

interface FilterBarProps {
  searchText: string
  onSearchChange: (value: string) => void
  status: 'ALL' | CertStatus
  onStatusChange: (status: 'ALL' | CertStatus) => void
  limit: number
  onLimitChange: (limit: number) => void
  onClearCerts?: () => void
}

export default function FilterBar({ 
  searchText, 
  onSearchChange, 
  status, 
  onStatusChange, 
  limit, 
  onLimitChange,
  onClearCerts 
}: FilterBarProps) {
  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <input
          type='text'
          placeholder='Tìm theo hash, người nhận, văn bằng...'
          value={searchText}
          onChange={(e) => {
            const newSearchText = e.target.value
            onSearchChange(newSearchText)
            if (newSearchText === '' && onClearCerts) {
              onClearCerts()
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
          value={status} 
          onChange={(e) => onStatusChange(e.target.value as 'ALL' | CertStatus)}
          style={{ minWidth: '140px', padding: '8px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          <option value='ALL'>Tất cả</option>
          <option value='PENDING'>Chờ duyệt</option>
          <option value='APPROVED'>Đã duyệt</option>
          <option value='REJECTED'>Bị từ chối</option>
          <option value='VALID'>Hợp lệ</option>
          <option value='REVOKED'>Đã thu hồi</option>
          <option value='EXPIRED'>Đã hết hạn</option>
        </select>
        <label style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>Hiển thị:</label>
        <select
          value={limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
          style={{ minWidth: '70px', padding: '8px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  )
}

