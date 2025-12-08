import { IconMinus, IconPlus, IconRefresh } from '@tabler/icons-react'

interface ZoomControlsProps {
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  minZoom?: number
  maxZoom?: number
  step?: number
}

export default function ZoomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onReset,
  minZoom = 0.5,
  maxZoom = 2,
  step = 0.1
}: ZoomControlsProps) {
  const canZoomOut = zoomLevel > minZoom
  const canZoomIn = zoomLevel < maxZoom

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      background: 'white',
      padding: '6px 8px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      border: '1px solid #e5e7eb'
    }}>
      <button
        className='btn btn-ghost'
        onClick={onZoomOut}
        disabled={!canZoomOut}
        style={{ 
          padding: '6px 8px', 
          minWidth: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: canZoomOut ? 1 : 0.5,
          cursor: canZoomOut ? 'pointer' : 'not-allowed'
        }}
        title="Thu nhỏ"
      >
        <IconMinus size={16} />
      </button>
      <span style={{ 
        fontSize: '13px', 
        fontWeight: '500',
        color: '#374151', 
        minWidth: '50px', 
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 8px'
      }}>
        {Math.round(zoomLevel * 100)}%
      </span>
      <button
        className='btn btn-ghost'
        onClick={onZoomIn}
        disabled={!canZoomIn}
        style={{ 
          padding: '6px 8px', 
          minWidth: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: canZoomIn ? 1 : 0.5,
          cursor: canZoomIn ? 'pointer' : 'not-allowed'
        }}
        title="Phóng to"
      >
        <IconPlus size={16} />
      </button>
      <div style={{ 
        width: '1px', 
        height: '20px', 
        background: '#e5e7eb', 
        margin: '0 4px' 
      }} />
      <button
        className='btn btn-ghost'
        onClick={onReset}
        style={{ 
          padding: '6px 10px', 
          fontSize: '12px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Reset zoom"
      >
        <IconRefresh size={14} />
      </button>
    </div>
  )
}




