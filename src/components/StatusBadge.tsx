type Props = { status: 'VALID' | 'REVOKED' | 'NOT_FOUND' }

const STATUS_MAP: Record<Props['status'], { label: string; tone: 'success' | 'danger' | 'muted' }> = {
  VALID: { label: 'Hợp lệ', tone: 'success' },
  REVOKED: { label: 'Đã thu hồi', tone: 'danger' },
  NOT_FOUND: { label: 'Không tìm thấy', tone: 'muted' },
}

export default function StatusBadge({ status }: Props) {
  const state = STATUS_MAP[status]
  return <span className={`status-badge ${state.tone}`}>{state.label}</span>
}
