import client from './client'

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN'

export interface UserSummary {
  id: string
  email: string
  name: string
  address: string
  role: UserRole
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface UserListParams {
  page?: number
  limit?: number
  q?: string
  role?: UserRole | 'ALL'
}

export interface UserListResponse {
  items: UserSummary[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Helper function để format error messages cho user
function formatErrorMessage(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  
  if (error.message) {
    if (typeof error.message === 'string' && !error.message.includes('Failed to fetch') && !error.message.includes('Network')) {
      return error.message
    }
  }

  if (error.code === 'ERR_NETWORK' || error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
    return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.'
  }

  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Yêu cầu xử lý quá lâu. Vui lòng thử lại sau.'
  }

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
      case 500:
        return 'Lỗi hệ thống. Vui lòng thử lại sau.'
      default:
        return `Lỗi không xác định (${error.response.status}). Vui lòng thử lại.`
    }
  }

  return 'Có lỗi xảy ra. Vui lòng thử lại sau.'
}

export async function listUsers(params: UserListParams = {}) {
  try {
    const query: Record<string, any> = { ...params }
    if (query.role === 'ALL') delete query.role
    const { data } = await client.get('/users', { params: query })
    return data as UserListResponse
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

export async function createUser(userData: { email: string; password: string; name: string; address?: string; role?: UserRole }) {
  try {
    const { data } = await client.post('/users', userData)
    return data as UserSummary
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

export async function updateUser(id: string, userData: { name?: string; email?: string; address?: string; enabled?: boolean; role?: UserRole; password?: string }) {
  try {
    const { data } = await client.put(`/users/${id}`, userData)
    return data as UserSummary
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

export async function deleteUser(id: string) {
  try {
    const { data } = await client.delete(`/users/${id}`)
    return data as { ok: boolean; message: string }
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

