/**
 * Truncate hash string để hiển thị gọn
 */
export const truncateHash = (hash: string, start = 6, end = 4): string => {
  if (hash.length <= start + end) return hash
  return `${hash.slice(0, start)}...${hash.slice(-end)}`
}

/**
 * Copy text to clipboard và hiển thị feedback trên button
 */
export const copyToClipboard = (text: string, button: HTMLButtonElement): void => {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent
    button.textContent = '✓'
    button.style.opacity = '1'
    setTimeout(() => {
      button.textContent = originalText
      button.style.opacity = ''
    }, 1500)
  }).catch(() => {
    // Fallback if clipboard API fails
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    
    const originalText = button.textContent
    button.textContent = '✓'
    button.style.opacity = '1'
    setTimeout(() => {
      button.textContent = originalText
      button.style.opacity = ''
    }, 1500)
  })
}

/**
 * Tính toán các số trang để hiển thị trong pagination
 */
export const getPageNumbers = (current: number, totalPages: number): (number | string)[] => {
  const pages: (number | string)[] = []

  if (totalPages <= 7) {
    // Hiển thị tất cả các trang nếu ít hơn 7
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Trang đầu
    pages.push(1)

    // Dấu ba chấm trước nếu cần
    if (current > 3) {
      pages.push('...')
    }

    // Các trang xung quanh trang hiện tại
    const start = Math.max(2, current - 1)
    const end = Math.min(totalPages - 1, current + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    // Dấu ba chấm sau nếu cần
    if (current < totalPages - 2) {
      pages.push('...')
    }

    // Trang cuối
    pages.push(totalPages)
  }

  return pages
}

