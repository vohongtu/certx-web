type Props = { status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'VALID' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND' }

const STATUS_MAP: Record<Props['status'], { label: string; tone: 'success' | 'danger' | 'muted' | 'warning' | 'info' }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'info' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
  VALID: { label: 'Hợp lệ', tone: 'success' },
  REVOKED: { label: 'Đã thu hồi', tone: 'danger' },
  EXPIRED: { label: 'Đã hết hạn', tone: 'warning' },
  NOT_FOUND: { label: 'Không tìm thấy', tone: 'muted' },
}

export default function StatusBadge({ status }: Props) {
  const state = STATUS_MAP[status]
  return <span className={`status-badge ${state.tone}`}>{state.label}</span>
}
