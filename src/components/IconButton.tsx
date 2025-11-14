import { ReactNode } from 'react'

interface IconButtonProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  className?: string
  disabled?: boolean
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  href?: string
  target?: string
  rel?: string
}

export default function IconButton({
  icon,
  label,
  onClick,
  className = '',
  disabled = false,
  variant = 'ghost',
  href,
  target,
  rel
}: IconButtonProps) {
  const baseClasses = 'icon-btn'
  const variantClass = `icon-btn--${variant}`
  const classes = `${baseClasses} ${variantClass} ${className} ${disabled ? 'icon-btn--disabled' : ''}`.trim()

  const buttonContent = (
    <>
      <span className='icon-btn-content' aria-label={label}>
        {icon}
      </span>
      <span className='icon-btn-tooltip'>{label}</span>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={classes}
        aria-label={label}
        title={label}
      >
        {buttonContent}
      </a>
    )
  }

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {buttonContent}
    </button>
  )
}

