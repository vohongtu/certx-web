import { ReactNode, cloneElement, isValidElement } from 'react'

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
  iconColor?: string
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
  rel,
  iconColor
}: IconButtonProps) {
  const baseClasses = 'icon-btn'
  const variantClass = `icon-btn--${variant}`
  const hasIconColor = iconColor ? 'icon-btn--has-color' : ''
  const classes = `${baseClasses} ${variantClass} ${hasIconColor} ${className} ${disabled ? 'icon-btn--disabled' : ''}`.trim()

  // Apply icon color if provided (Tabler icons use 'stroke' prop)
  // Apply directly to icon element
  const iconWithColor = iconColor && isValidElement(icon)
    ? cloneElement(icon as React.ReactElement<any>, { 
        stroke: iconColor,
        color: iconColor
      })
    : icon

  const buttonContent = (
    <>
      <span 
        className='icon-btn-content' 
        aria-label={label}
        style={iconColor ? { '--icon-color': iconColor } as React.CSSProperties : undefined}
      >
        {iconWithColor}
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

