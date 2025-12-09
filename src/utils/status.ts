import { CertStatus } from '../api/certs.api'

/**
 * Tính toán status dựa trên expirationDate
 * @param baseStatus - Status từ database ('VALID' | 'REVOKED')
 * @param expirationDate - Ngày hết hạn (tùy chọn)
 * @returns Status đã tính toán, có thể là 'EXPIRED' nếu đã hết hạn
 */
export function calculateStatus(baseStatus: 'VALID' | 'REVOKED', expirationDate?: string): CertStatus {
  if (baseStatus === 'REVOKED') {
    return 'REVOKED'
  }
  
  if (!expirationDate) {
    return baseStatus
  }
  
  // Kiểm tra xem đã hết hạn chưa
  try {
    const expiration = new Date(expirationDate)
    expiration.setHours(23, 59, 59, 999) // Đặt thời gian cuối ngày
    const now = new Date()
    
    if (now > expiration) {
      return 'EXPIRED'
    }
  } catch (error) {
    console.error('Error parsing expirationDate:', error)
  }
  
  return baseStatus
}

