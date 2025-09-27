export default function StatusBadge({ status }: { status:'VALID'|'REVOKED'|'NOT_FOUND' }) {
  const color = status === 'VALID' ? '#16a34a' : status === 'REVOKED' ? '#dc2626' : '#6b7280'
  const text  = status === 'VALID' ? 'Hợp lệ' : status === 'REVOKED' ? 'Đã thu hồi' : 'Không tìm thấy'
  return (
    <span style={{ 
      padding:'4px 8px', 
      background:color, 
      color:'#fff', 
      borderRadius:6 
    }}>
      {text}
    </span>
  )
}
