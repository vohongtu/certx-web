import { useLayoutEffect, useRef, useState, useMemo } from "react"
import { Document, Page } from "react-pdf"

// Worker đã được setup trong pdf-worker-setup.ts (import ở main.tsx)

type ViewerMode = "fit" | "zoom"

type Props = {
  file: string | ArrayBuffer | Blob // URL, buffer, hoặc Blob
  initialMode?: ViewerMode
  showControls?: boolean // Ẩn/hiện controls (toolbar)
}

export default function PdfViewer({ file, initialMode = "fit", showControls = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<ViewerMode>(initialMode)
  const [fitWidth, setFitWidth] = useState<number>(800)
  const [scale, setScale] = useState<number>(1)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    const onResize = () => {
      const w = wrapRef.current?.clientWidth ?? 800
      setFitWidth(Math.max(240, w - 24))
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const zoomOut = () => mode === "zoom"
    ? setScale(v => Math.max(0.25, +(v / 1.1).toFixed(2)))
    : setFitWidth(w => Math.max(240, w - 80))

  const zoomIn = () => mode === "zoom"
    ? setScale(v => Math.min(4, +(v * 1.1).toFixed(2)))
    : setFitWidth(w => w + 80)

  const reset = () => { 
    setMode("fit")
    setScale(1)
    const w = wrapRef.current?.clientWidth ?? 800
    setFitWidth(Math.max(240, w - 24))
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('✅ PDF loaded successfully, pages:', numPages)
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ Error loading PDF:', error)
    setIsLoading(false)
    setError(error.message || 'Không thể tải file PDF. Vui lòng thử lại.')
  }

  // Memoize options để tránh warning và reload không cần thiết
  const documentOptions = useMemo(() => ({
    cMapPacked: true,
    httpHeaders: {},
    withCredentials: false,
  }), [])

  // Chuyển đổi Blob/ArrayBuffer thành URL nếu cần
  const fileUrl = useMemo(() => {
    if (typeof file === 'string') {
      return file // Đã là URL
    }
    if (file instanceof Blob) {
      // Tạo URL từ Blob
      return URL.createObjectURL(file)
    }
    if (file instanceof ArrayBuffer) {
      // Tạo Blob từ ArrayBuffer rồi tạo URL
      const blob = new Blob([file], { type: 'application/pdf' })
      return URL.createObjectURL(blob)
    }
    return null
  }, [file])

  // Cleanup URL khi component unmount
  useLayoutEffect(() => {
    return () => {
      if (fileUrl && typeof file === 'object' && !(file instanceof String)) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [fileUrl, file])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Controls - chỉ hiển thị nếu showControls = true */}
      {showControls && (
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
        flexShrink: 0
      }}>
        {numPages > 1 && (
          <>
            <button
              className='btn btn-ghost'
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              style={{ padding: '6px 12px', fontSize: '14px' }}
            >
              ← Trước
            </button>
            <span style={{ fontSize: '14px', color: '#666', minWidth: '80px', textAlign: 'center' }}>
              {pageNumber} / {numPages}
            </span>
            <button
              className='btn btn-ghost'
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              style={{ padding: '6px 12px', fontSize: '14px' }}
            >
              Sau →
            </button>
            <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 8px' }} />
          </>
        )}
        <button
          className='btn btn-ghost'
          onClick={zoomOut}
          style={{ padding: '6px 12px', fontSize: '18px', minWidth: '40px' }}
          title="Thu nhỏ"
        >
          −
        </button>
        <span style={{ fontSize: '14px', color: '#666', minWidth: '60px', textAlign: 'center' }}>
          {mode === "zoom" ? `${Math.round(scale * 100)}%` : `${Math.round((fitWidth / 800) * 100)}%`}
        </span>
        <button
          className='btn btn-ghost'
          onClick={zoomIn}
          style={{ padding: '6px 12px', fontSize: '18px', minWidth: '40px' }}
          title="Phóng to"
        >
          +
        </button>
        <button
          className='btn btn-ghost'
          onClick={reset}
          style={{ padding: '6px 12px', fontSize: '12px', marginLeft: '8px' }}
          title="Reset zoom"
        >
          Reset
        </button>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={mode === "zoom"}
            onChange={e => {
              setMode(e.target.checked ? "zoom" : "fit")
              if (!e.target.checked) {
                const w = wrapRef.current?.clientWidth ?? 800
                setFitWidth(Math.max(240, w - 24))
              }
            }}
            style={{ cursor: 'pointer' }}
          />
          <span>Zoom tự do</span>
        </label>
      </div>
      )}

      {/* PDF Viewer */}
      <div
        ref={wrapRef}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#1a1a1a',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: 12,
          minHeight: 0
        }}
      >
        {isLoading && !error && (
          <div style={{ color: '#fff', padding: '40px', fontSize: '16px', textAlign: 'center' }}>
            Đang tải PDF…
          </div>
        )}
        {error && (
          <div style={{ 
            color: '#fff', 
            padding: '40px', 
            fontSize: '16px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
              Lỗi tải PDF
            </div>
            <div>{error}</div>
            <button
              className='btn btn-primary'
              onClick={() => {
                setError(null)
                setIsLoading(true)
                // Force re-render bằng cách reset state
                window.location.reload()
              }}
              style={{ marginTop: '8px' }}
            >
              Thử lại
            </button>
          </div>
        )}
        {!error && fileUrl && (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div style={{ color: '#fff', padding: '40px', fontSize: '16px', textAlign: 'center' }}>
                Đang tải PDF…
              </div>
            }
            options={documentOptions}
          >
            {mode === "fit" ? (
              <Page
                pageNumber={pageNumber}
                renderMode="canvas"
                width={fitWidth}
              />
            ) : (
              <Page
                pageNumber={pageNumber}
                renderMode="canvas"
                scale={scale}
              />
            )}
          </Document>
        )}
      </div>
    </div>
  )
}
