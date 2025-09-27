import QRCode from 'qrcode.react'

export default function QRViewer({ value }: { value: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <QRCode value={value} size={160} />
    </div>
  )
}
