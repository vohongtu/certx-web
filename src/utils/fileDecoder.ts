// Helper function để decode file từ metadata (hỗ trợ cả format cũ và mới)
export function decodeFileFromMetadata(filePayload: any): Uint8Array | null {
  if (!filePayload) return null

  // Format cũ: Buffer object {type: 'Buffer', data: [...]}
  if (filePayload?.type === 'Buffer' && Array.isArray(filePayload.data)) {
    return new Uint8Array(filePayload.data)
  }

  // Format cũ: object có property data là array
  if (filePayload?.data && Array.isArray(filePayload.data) && !filePayload.type) {
    return new Uint8Array(filePayload.data)
  }

  // Format cũ: array trực tiếp
  if (Array.isArray(filePayload)) {
    return new Uint8Array(filePayload)
  }

  // Format mới: base64 string
  if (typeof filePayload === 'string') {
    try {
      const cleanBase64 = filePayload.trim().replace(/\s/g, '')
      if (cleanBase64.length === 0) return null
      
      const binaryString = atob(cleanBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes
    } catch (error) {
      console.error('Error decoding base64:', error)
      return null
    }
  }

  // Thử các property khác
  if (filePayload && typeof filePayload === 'object') {
    const possibleData = filePayload.buffer || filePayload.value || filePayload.content || filePayload.bytes
    if (Array.isArray(possibleData)) {
      return new Uint8Array(possibleData)
    }
    if (typeof possibleData === 'string') {
      try {
        const binaryString = atob(possibleData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes
      } catch (error) {
        console.error('Error decoding base64 from object property:', error)
        return null
      }
    }
  }

  return null
}

// Detect file type từ magic bytes
export function detectFileTypeFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 4) return 'unknown'
  
  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf'
  }
  
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png'
  }
  
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg'
  }
  
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif'
  }
  
  // WebP: RIFF...WEBP
  if (bytes.length >= 12 && 
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }
  
  // SVG: <svg hoặc <?xml
  if (bytes.length >= 5) {
    const start = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]).toLowerCase()
    if (start.startsWith('<svg') || start.startsWith('<?xml')) {
      return 'image/svg+xml'
    }
  }
  
  return 'unknown'
}


