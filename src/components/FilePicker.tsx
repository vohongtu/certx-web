import { useRef, useState } from 'react'

type Props = { onPick: (f: File | null) => void; file?: File | null; onError?: (msg: string) => void }

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value < 10 && exponent > 0 ? 1 : 0)} ${units[exponent]}`
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function FilePicker({ onPick, file, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      onPick(null)
      return
    }
    const next = files[0]
    
    // Kiểm tra kích thước file
    if (next.size > MAX_FILE_SIZE) {
      const fileSizeMB = (next.size / 1024 / 1024).toFixed(2)
      const errorMsg = `File quá lớn. Kích thước tối đa là 5MB. File của bạn: ${fileSizeMB}MB`
      if (onError) {
        onError(errorMsg)
      } else {
        alert(errorMsg)
      }
      return
    }
    
    onPick(next)
    if (onError) onError('') // Clear error
  }

  return (
    <div
      className={`upload-field${isDragging ? ' drag-active' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      role="group"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        hidden
        onChange={(event) => handleFiles(event.target.files)}
      />

      <span className="upload-icon">📄</span>

      <div className="upload-details">
        <span className="upload-title">{file ? 'Đã chọn file' : 'Chọn hoặc kéo-thả chứng chỉ'}</span>
        <span className="upload-note">
          {file
            ? `${file.name} • ${formatBytes(file.size)}`
            : 'Hỗ trợ PDF, JPG, PNG. Tối đa 5MB.'}
        </span>
      </div>

      <button
        type="button"
        className="btn btn-outline"
        onClick={(event) => {
          event.stopPropagation()
          inputRef.current?.click()
        }}
      >
        Chọn file
      </button>
    </div>
  )
}
