import { useState, useEffect } from 'react'

export interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UsePaginationOptions {
  defaultLimit?: number
  onPageChange?: (page: number, limit: number) => void
}

export const usePagination = (options: UsePaginationOptions = {}) => {
  const { defaultLimit = 10, onPageChange } = options
  
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: defaultLimit,
    total: 0,
    totalPages: 1
  })
  
  const [limit, setLimit] = useState(defaultLimit)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (onPageChange) {
      onPageChange(page, limit)
    }
  }, [page, limit, onPageChange])

  const updatePagination = (newPagination: Partial<PaginationState>) => {
    setPagination(prev => ({ ...prev, ...newPagination }))
  }

  const changePage = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, pagination.totalPages)))
  }

  const changeLimit = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const reset = () => {
    setPage(1)
    setLimit(defaultLimit)
    setPagination({
      page: 1,
      limit: defaultLimit,
      total: 0,
      totalPages: 1
    })
  }

  return {
    pagination,
    page,
    limit,
    setPage: changePage,
    setLimit: changeLimit,
    updatePagination,
    reset
  }
}

