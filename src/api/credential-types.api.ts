import client from './client'

export interface CredentialType {
  id: string
  name: string
  isPermanent: boolean
}

export interface CredentialTypeListResponse {
  items: CredentialType[]
  total: number
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Helper function để format error messages
function formatErrorMessage(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message
  }
  if (error?.message) {
    return error.message
  }
  return 'Có lỗi xảy ra'
}

// Lấy danh sách credential types
export async function listCredentialTypes(params?: { q?: string; page?: number; limit?: number }): Promise<CredentialTypeListResponse> {
  try {
    const response = await client.get('/credential-types', { params })
    return response.data
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Lấy một credential type theo ID
export async function getCredentialTypeById(id: string): Promise<CredentialType> {
  try {
    const response = await client.get(`/credential-types/${id}`)
    return response.data
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Tạo credential type mới (Admin only)
export async function createCredentialType(data: { id: string; name: string; isPermanent: boolean }): Promise<CredentialType> {
  try {
    const response = await client.post('/credential-types', data)
    return response.data
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Cập nhật credential type (Admin only)
export async function updateCredentialType(id: string, data: { name?: string; isPermanent?: boolean }): Promise<CredentialType> {
  try {
    const response = await client.put(`/credential-types/${id}`, data)
    return response.data
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Xóa credential type (Admin only)
export async function deleteCredentialType(id: string): Promise<void> {
  try {
    await client.delete(`/credential-types/${id}`)
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

