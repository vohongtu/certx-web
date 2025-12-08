import client from './client'

export interface CredentialValidityOption {
  id: string
  credentialTypeId: string
  periodMonths: number | null
  periodDays: number | null
  note: string | null
}

export interface CredentialValidityOptionListResponse {
  items: CredentialValidityOption[]
  total: number
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

// Lấy danh sách validity options theo credentialTypeId
export async function listValidityOptions(credentialTypeId?: string): Promise<CredentialValidityOptionListResponse> {
  try {
    const params = credentialTypeId ? { credentialTypeId } : {}
    const response = await client.get('/credential-validity-options', { params })
    return response.data
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Lấy một validity option theo ID
export async function getValidityOptionById(id: string): Promise<CredentialValidityOption> {
  try {
    const response = await client.get(`/credential-validity-options/${id}`)
    return response.data
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Tạo validity option mới (Admin only)
export async function createValidityOption(data: {
  id: string
  credentialTypeId: string
  periodMonths?: number | null
  periodDays?: number | null
  note?: string | null
}): Promise<CredentialValidityOption> {
  try {
    const response = await client.post('/credential-validity-options', data)
    return response.data
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Cập nhật validity option (Admin only)
export async function updateValidityOption(
  id: string,
  data: {
    credentialTypeId?: string
    periodMonths?: number | null
    periodDays?: number | null
    note?: string | null
  }
): Promise<CredentialValidityOption> {
  try {
    const response = await client.put(`/credential-validity-options/${id}`, data)
    return response.data
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

// Xóa validity option (Admin only)
export async function deleteValidityOption(id: string): Promise<void> {
  try {
    await client.delete(`/credential-validity-options/${id}`)
  } catch (error: any) {
    throw new Error(formatErrorMessage(error))
  }
}

