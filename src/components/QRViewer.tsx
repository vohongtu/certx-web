import QRCode from 'qrcode.react'

export default function QRViewer({ value }: { value: string }) {
  return (
    <div className="qr-wrapper">
      <QRCode value={value} size={160} />
    </div>
  )
}
