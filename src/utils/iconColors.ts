// Icon color configuration
export const iconColors = {
  preview: '#475569',
  approve: '#16a34a',
  reject: '#ef4444',
  revoke: '#f59e0b',
  editTime: '#4f46e5',
  verify: '#059669',
  metadata: '#334155',
  edit: '#2563eb',
  reupload: '#7c3aed',
  delete: '#ef4444', // Same as reject for delete/trash
  transfer: '#06b6d4', // cyan
} as const

export type IconKey = keyof typeof iconColors

export function getIconColor(key: IconKey): string {
  return iconColors[key] || '#64748b' // Default gray
}

