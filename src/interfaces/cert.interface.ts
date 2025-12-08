export default interface CertIPFS {
  holderName: string
  degree: string
  issuedDate: string
  expirationDate?: string
  certxIssuedDate?: string // Ngày up chứng chỉ trên CertX (ngày xác thực)
  issuerName: string
  issuerId?: string // ID của người cấp phát
  approvedBy?: string // ID của người duyệt (admin)
  docHash: string
  mimeType?: string
  file?: any
  hashBeforeWatermark?: string
  watermarkApplied?: boolean
  watermarkText?: string
  watermarkOpacity?: number
  watermarkColor?: string
  watermarkRepeat?: number
  watermarkMargin?: number
  watermarkFontPath?: string | null
  watermarkOriginalText?: string
  watermarkUsedCustomFont?: boolean
}
