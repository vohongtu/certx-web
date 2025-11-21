export const cutHash = (h: string, len = 10) => 
  h.length > 2*len ? `${h.slice(0,len)}...${h.slice(-len)}` : h

/**
 * Format date thành YYYY-MM-DD từ local date (không bị ảnh hưởng bởi timezone)
 * @param date - Date object hoặc year, month, day
 */
export const formatDateLocal = (date: Date | { year: number; month: number; day: number }): string => {
  if (date instanceof Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } else {
    const year = date.year
    const month = String(date.month + 1).padStart(2, '0')
    const day = String(date.day).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}

/**
 * Parse date string YYYY-MM-DD thành local Date (không bị ảnh hưởng bởi timezone)
 * @param dateStr - Date string dạng YYYY-MM-DD
 */
export const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const formatDateShort = (value?: string): string => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return value
  }
}

export const formatDateRange = (issuedDate?: string, expirationDate?: string): string => {
  const issued = formatDateShort(issuedDate)
  if (!expirationDate) return issued
  const expiration = formatDateShort(expirationDate)
  return `${issued} - ${expiration}`
}
