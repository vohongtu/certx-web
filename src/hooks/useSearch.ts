import { useState, useEffect } from 'react'

export interface UseSearchOptions {
  debounceMs?: number
  onSearch?: (search: string) => void
}

export const useSearch = (options: UseSearchOptions = {}) => {
  const { debounceMs = 500, onSearch } = options
  
  const [searchText, setSearchText] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchText.trim())
      if (onSearch) {
        onSearch(searchText.trim())
      }
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [searchText, debounceMs, onSearch])

  const reset = () => {
    setSearchText('')
    setAppliedSearch('')
  }

  return {
    searchText,
    appliedSearch,
    setSearchText,
    reset
  }
}

