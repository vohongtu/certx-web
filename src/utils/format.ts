export const cutHash = (h: string, len = 10) => 
  h.length > 2*len ? `${h.slice(0,len)}...${h.slice(-len)}` : h

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
