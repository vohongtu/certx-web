export default interface CertIPFS {
  holderName: string
  degree: string
  issuedDate: string
  issuerName: string
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
