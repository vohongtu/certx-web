import { useRef } from 'react'
import QRCode from 'qrcode.react'
import { IconDownload } from '@tabler/icons-react'

export default function QRViewer({ value }: { value: string }) {
  const qrRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!qrRef.current) return

    try {
      // Đợi một chút để đảm bảo canvas đã được render
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Tìm canvas element trong QRCode component
      const canvas = qrRef.current.querySelector('canvas') as HTMLCanvasElement
      if (!canvas) {
        alert('Không thể tải QR code. Vui lòng thử lại.')
        return
      }

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Không thể tải QR code')
          return
        }

        // Tạo download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `qrcode-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 'image/png', 1.0)
    } catch (error) {
      console.error('Error downloading QR code:', error)
      alert('Có lỗi xảy ra khi tải QR code')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div className="qr-wrapper" ref={qrRef}>
        <QRCode value={value} size={160} />
      </div>
      <button
        className="btn btn-outline"
        onClick={handleDownload}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          fontSize: '14px',
          padding: '6px 12px'
        }}
      >
        <IconDownload size={16} />
        Lưu QR code
      </button>
    </div>
  )
}
