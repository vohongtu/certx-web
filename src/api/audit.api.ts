import client from './client'

export type AuditAction = 
  | 'LOGIN' | 'LOGOUT' | 'REGISTER'
  | 'CERT_UPLOAD' | 'CERT_APPROVE' | 'CERT_REJECT' | 'CERT_REVOKE' | 'CERT_ISSUE' | 'CERT_REUPLOAD' | 'CERT_UPDATE_EXPIRATION' | 'CERT_TRANSFER'
  | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE' | 'USER_ENABLE' | 'USER_DISABLE'
  | 'CREDENTIAL_TYPE_CREATE' | 'CREDENTIAL_TYPE_UPDATE' | 'CREDENTIAL_TYPE_DELETE'
  | 'CREDENTIAL_VALIDITY_CREATE' | 'CREDENTIAL_VALIDITY_UPDATE' | 'CREDENTIAL_VALIDITY_DELETE'
  | 'SYSTEM_CONFIG_UPDATE'

export type AuditStatus = 'SUCCESS' | 'FAILURE'

export interface AuditLog {
  _id: string
  userId: string
  userEmail: string
  userRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  action: AuditAction
  status: AuditStatus
  resourceType?: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface AuditLogListResponse {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AuditStats {
  totalLogs: number
  actionStats: Array<{ _id: AuditAction; count: number }>
  statusStats: Array<{ _id: AuditStatus; count: number }>
  roleStats: Array<{ _id: 'USER' | 'ADMIN' | 'SUPER_ADMIN'; count: number }>
  period: {
    startDate: string
    endDate: string
  }
}

export interface AuditLogFilters {
  page?: number
  limit?: number
  userId?: string
  userRole?: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  action?: AuditAction
  status?: AuditStatus
  resourceType?: string
  resourceId?: string
  startDate?: string
  endDate?: string
  search?: string
}

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogListResponse> {
  const params = new URLSearchParams()
  
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.userId) params.append('userId', filters.userId)
  if (filters.userRole) params.append('userRole', filters.userRole)
  if (filters.action) params.append('action', filters.action)
  if (filters.status) params.append('status', filters.status)
  if (filters.resourceType) params.append('resourceType', filters.resourceType)
  if (filters.resourceId) params.append('resourceId', filters.resourceId)
  if (filters.startDate) params.append('startDate', filters.startDate)
  if (filters.endDate) params.append('endDate', filters.endDate)
  if (filters.search) params.append('search', filters.search)

  const response = await client.get(`/audit/logs?${params.toString()}`)
  return response.data
}

export async function getAuditStats(startDate?: string, endDate?: string): Promise<AuditStats> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const response = await client.get(`/audit/stats?${params.toString()}`)
  return response.data
}

