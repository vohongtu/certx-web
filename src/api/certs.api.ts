import client from './client'

export type CertStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'VALID' | 'REVOKED' | 'EXPIRED'

export interface CertSummary {
  id: string
  docHash: string
  holderName: string
  degree: string
  issuedDate: string
  expirationDate?: string
  certxIssuedDate?: string // Ngày up chứng chỉ trên CertX (ngày xác thực)
  credentialTypeId?: string // ID của loại văn bằng
  validityOptionId?: string // ID của tùy chọn thời hạn
  status: CertStatus
  metadataUri?: string
  createdAt: string
  updatedAt: string
  revokedAt?: string
  rejectionReason?: string
  allowReupload?: boolean
  approvedBy?: string
  rejectedBy?: string
  approvedAt?: string
  rejectedAt?: string
  reuploadedFrom?: string // ID của cert gốc nếu là reup
  reuploadNote?: string // Ghi chú khi reup
}

// Helper function để format error messages cho user
function formatErrorMessage(error: any): string {
  // Lấy message từ backend
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  
  if (error.message) {
    // Các lỗi đã được format sẵn
    if (typeof error.message === 'string' && !error.message.includes('Failed to fetch') && !error.message.includes('Network')) {
      return error.message
    }
  }

  // Lỗi network
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
    return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.'
  }

  // Lỗi timeout
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Yêu cầu xử lý quá lâu. Vui lòng thử lại sau.'
  }

  // Lỗi HTTP status
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đã nhập.'
      case 401:
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      case 403:
        return 'Bạn không có quyền thực hiện thao tác này.'
      case 404:
        return 'Không tìm thấy tài nguyên yêu cầu.'
      case 413:
        return 'File quá lớn. Kích thước tối đa là 5MB.'
      case 500:
        return 'Lỗi hệ thống. Vui lòng thử lại sau.'
      default:
        return `Lỗi không xác định (${error.response.status}). Vui lòng thử lại.`
    }
  }

  return 'Có lỗi xảy ra. Vui lòng thử lại sau.'
}

function getApiBaseUrl(): string {
  const isDev = import.meta.env.DEV
  const envApiBase = import.meta.env.VITE_API_BASE
  return envApiBase 
    ? envApiBase 
    : isDev 
      ? '/api' 
      : 'http://localhost:8080' 
}

export async function issueCert(form: FormData) {
  const isDev = import.meta.env.DEV
  const proxyUrl =  `${getApiBaseUrl()}/certs/issue`
  const storageKey = import.meta.env.VITE_STORAGE_TOKEN || 'certx_token'
  const token = localStorage.getItem(storageKey)

  if (!token && isDev) {
    console.warn('[issueCert] No token found in localStorage')
  }

  try {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: headers,
      body: form,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      const error = new Error(errorData.message || response.statusText)
      ;(error as any).response = { status: response.status, data: errorData }
      throw error
    }

    const data = await response.json()
    return data as { hash: string; verifyUrl: string; qrcodeDataUrl?: string }
  } catch (error: any) {
    // Log chi tiết chỉ ở dev mode
    if (isDev) {
      console.error('[issueCert] Error:', error)
    }

    // Nếu fetch fail, thử fallback về axios
    if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
      try {
        const axios = (await import('axios')).default
        const axiosInstance = axios.create({
          baseURL: '',
          timeout: 60000,
        })
        
        const config: any = {
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
        
        if (token) {
          config.headers = { Authorization: `Bearer ${token}` }
        }
        
        const { data } = await axiosInstance.post(proxyUrl, form, config)
        return data as { hash: string; verifyUrl: string; qrcodeDataUrl?: string }
      } catch (axiosError: any) {
        if (isDev) {
          console.error('[issueCert] Axios fallback also failed:', axiosError)
        }
        throw new Error(formatErrorMessage(axiosError))
      }
    }
    
    throw new Error(formatErrorMessage(error))
  }
}

export interface CertListParams {
  page?: number
  limit?: number
  q?: string
  status?: CertStatus | 'ALL'
}

export interface CertListResponse {
  items: CertSummary[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function listCerts(params: CertListParams = {}) {
  try {
    const query: Record<string, any> = { ...params }
    if (query.status === 'ALL') delete query.status
    const { data } = await client.get('/certs', { params: query })
    return data as CertListResponse
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

export async function revokeCert(hash: string) {
  try {
    const { data } = await client.post('/certs/revoke', { hash })
    return data as { ok: boolean; status?: CertStatus }
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

export async function verifyHash(hash: string) {
  try {
    const { data } = await client.get('/verify', { params: { hash } })
    return data as { status: 'VALID' | 'REVOKED' | 'NOT_FOUND'; metadataURI: any; source?: 'chain' | 'db' }
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// User upload file (chỉ upload, không cấp phát)
export async function uploadFile(form: FormData) {
  const isDev = import.meta.env.DEV
  const proxyUrl = `${getApiBaseUrl()}/certs/upload`
  const storageKey = import.meta.env.VITE_STORAGE_TOKEN || 'certx_token'
  const token = localStorage.getItem(storageKey)

  if (!token && isDev) {
    console.warn('[uploadFile] No token found in localStorage')
  }

  try {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: headers,
      body: form,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      const error = new Error(errorData.message || response.statusText)
      ;(error as any).response = { status: response.status, data: errorData }
      throw error
    }

    const data = await response.json()
    return data as { id: string; docHash: string; status: CertStatus; message: string }
  } catch (error: any) {
    if (isDev) {
      console.error('[uploadFile] Error:', error)
    }

    if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
      try {
        const axios = (await import('axios')).default
        const axiosInstance = axios.create({
          baseURL: '',
          timeout: 60000,
        })
        
        const config: any = {
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
        
        if (token) {
          config.headers = { Authorization: `Bearer ${token}` }
        }
        
        const { data } = await axiosInstance.post(proxyUrl, form, config)
        return data as { id: string; docHash: string; status: CertStatus; message: string }
      } catch (axiosError: any) {
        if (isDev) {
          console.error('[uploadFile] Axios fallback also failed:', axiosError)
        }
        throw new Error(formatErrorMessage(axiosError))
      }
    }
    
    throw new Error(formatErrorMessage(error))
  }
}

// Admin approve cert
export async function approveCert(id: string, params: { issuedDate?: string; expirationDate?: string; validityOptionId?: string; expirationMonths?: number; expirationYears?: number }) {
  try {
    const { data } = await client.post(`/certs/${id}/approve`, params)
    return data as { ok: boolean; hash: string; verifyUrl: string; qrcodeDataUrl?: string; expirationDate?: string }
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Admin reject cert
export async function rejectCert(id: string, rejectionReason: string, allowReupload: boolean = false) {
  try {
    const { data } = await client.post(`/certs/${id}/reject`, { rejectionReason, allowReupload })
    return data as { ok: boolean; message: string; allowReupload?: boolean }
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Admin update expiration date
export async function updateExpirationDate(id: string, params: { issuedDate?: string; expirationDate?: string; validityOptionId?: string; expirationMonths?: number; expirationYears?: number }) {
  try {
    const { data } = await client.put(`/certs/${id}/expiration`, params)
    return data as { ok: boolean; message: string; issuedDate?: string; expirationDate: string }
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Admin revoke cert
export async function revokeCertByAdmin(id: string) {
  try {
    const { data } = await client.post(`/certs/${id}/revoke`)
    return data as { ok: boolean; message: string }
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Super admin chuyển người nhận chứng chỉ
export async function transferCertificate(id: string, newUserId: string, note: string, holderName?: string) {
  try {
    const { data } = await client.post(`/certs/${id}/transfer`, {
      newUserId,
      note,
      holderName: holderName || undefined
    })
    return data as { ok: boolean; message: string; cert: CertSummary }
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Admin preview cert file - fetch file và tạo blob URL
export async function getPreviewBlobUrl(id: string): Promise<string> {
  try {
    const response = await client.get(`/certs/${id}/preview`, {
      responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' })
    return URL.createObjectURL(blob)
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// User reupload cert
export async function reuploadCert(id: string, form: FormData) {
  const isDev = import.meta.env.DEV
  const proxyUrl = `${getApiBaseUrl()}/certs/${id}/reupload`
  const storageKey = import.meta.env.VITE_STORAGE_TOKEN || 'certx_token'
  const token = localStorage.getItem(storageKey)

  if (!token && isDev) {
    console.warn('[reuploadCert] No token found in localStorage')
  }

  try {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: headers,
      body: form,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      const error = new Error(errorData.message || response.statusText)
      ;(error as any).response = { status: response.status, data: errorData }
      throw error
    }

    const data = await response.json()
    return data as { id: string; docHash: string; status: CertStatus; message: string }
  } catch (error: any) {
    if (isDev) {
      console.error('[reuploadCert] Error:', error)
    }

    if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
      try {
        const axios = (await import('axios')).default
        const axiosInstance = axios.create({
          baseURL: '',
          timeout: 60000,
        })
        
        const config: any = {
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
        
        if (token) {
          config.headers = { Authorization: `Bearer ${token}` }
        }
        
        const { data } = await axiosInstance.post(proxyUrl, form, config)
        return data as { id: string; docHash: string; status: CertStatus; message: string }
      } catch (axiosError: any) {
        if (isDev) {
          console.error('[reuploadCert] Axios fallback also failed:', axiosError)
        }
        throw new Error(formatErrorMessage(axiosError))
      }
    }
    
    throw new Error(formatErrorMessage(error))
  }
}

// Admin list pending certs
export async function listPendingCerts(params: CertListParams = {}) {
  try {
    const query: Record<string, any> = { ...params }
    if (query.status === 'ALL') delete query.status
    const { data } = await client.get('/certs/pending', { params: query })
    return data as CertListResponse
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}
