import { useState, useEffect } from 'react'
import PdfViewer from './PdfViewer'
import ZoomControls from './ZoomControls'
import { getPreviewBlobUrl } from '../api/certs.api'

interface CertSummary {
  id: string
  holderName: string
  degree: string
  [key: string]: any
}

interface PreviewModalProps {
  cert: CertSummary | null
  isOpen: boolean
  onClose: () => void
}

export default function PreviewModal({ cert, isOpen, onClose }: PreviewModalProps) {
  const [previewFile, setPreviewFile] = useState<{ url: string; mimeType: string; blob?: Blob } | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Load preview file khi cert thay đổi
  useEffect(() => {
    if (!isOpen || !cert) {
      setPreviewFile(null)
      setPreviewError(null)
      setZoomLevel(1)
      return
    }

    const loadPreview = async () => {
      setPreviewError(null)
      setIsLoadingPreview(true)
      try {
        const blobUrl = await getPreviewBlobUrl(cert.id)
        const response = await fetch(blobUrl)
        const blob = await response.blob()
        const mimeType = blob.type || 'application/pdf'
        const url = URL.createObjectURL(blob)
        setPreviewFile({ 
          url, 
          mimeType, 
          blob: mimeType.startsWith('image/') ? undefined : blob 
        })
      } catch (err: any) {
        setPreviewError(err.message || 'Không thể tải file để xem trước')
      } finally {
        setIsLoadingPreview(false)
      }
    }

    loadPreview()
  }, [isOpen, cert])

  // Cleanup URL khi unmount hoặc đóng modal
  useEffect(() => {
    return () => {
      if (previewFile?.url) {
        URL.revokeObjectURL(previewFile.url)
      }
    }
  }, [previewFile?.url])

  const handleClose = () => {
    if (previewFile?.url) {
      URL.revokeObjectURL(previewFile.url)
    }
    setPreviewFile(null)
    setPreviewError(null)
    setZoomLevel(1)
    onClose()
  }

  if (!isOpen || !cert) return null

  return (
    <div 
      className='modal-overlay' 
      onClick={handleClose}
      style={{ zIndex: 2000 }}
    >
      <div 
        className='modal' 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '95vw', 
          width: '1200px',
          height: '90vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0
        }}
      >
        <div className='modal-header' style={{ flexShrink: 0, padding: '20px 24px' }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: '4px' }}>Xem trước file chứng chỉ</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
              {cert.holderName} • {cert.degree}
            </p>
          </div>
          <button 
            className='modal-close-btn' 
            onClick={handleClose}
            style={{ fontSize: '28px' }}
          >
            ×
          </button>
        </div>
        <div 
          className='modal-body' 
          style={{ 
            flex: 1,
            overflow: 'hidden',
            padding: '0',
            display: 'flex',
            flexDirection: 'column',
            background: '#f9fafb',
            minHeight: 0,
            position: 'relative'
          }}
        >
          {previewError ? (
            <div className='alert' style={{ margin: '16px' }}>⚠️ {previewError}</div>
          ) : previewFile ? (
            <>
              {previewFile.mimeType.startsWith('image/') ? (
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f9fafb',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s'
                }}>
                  <img 
                    src={previewFile.url} 
                    alt='Certificate' 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                      background: '#fff',
                      padding: '8px'
                    }} 
                  />
                </div>
              ) : (
                <div style={{ 
                  flex: 1, 
                  overflow: 'hidden',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top left',
                  transition: 'transform 0.2s',
                  width: `${100 / zoomLevel}%`,
                  height: `${100 / zoomLevel}%`
                }}>
                  <PdfViewer 
                    file={previewFile.blob || previewFile.url} 
                    initialMode="fit" 
                    showControls={false}
                  />
                </div>
              )}
              {/* Zoom controls */}
              <div style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                zIndex: 10
              }}>
                <ZoomControls
                  zoomLevel={zoomLevel}
                  onZoomIn={() => setZoomLevel(z => Math.min(2, z + 0.1))}
                  onZoomOut={() => setZoomLevel(z => Math.max(0.5, z - 0.1))}
                  onReset={() => setZoomLevel(1)}
                />
              </div>
            </>
          ) : (
            <div className='loading-state' style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              Đang tải file...
            </div>
          )}
        </div>
        <div className='modal-actions' style={{ flexShrink: 0, padding: '16px 24px' }}>
          <button
            className='btn btn-ghost'
            onClick={handleClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}



