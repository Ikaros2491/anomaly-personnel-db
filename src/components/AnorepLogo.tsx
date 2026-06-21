interface AnorepLogoProps {
  variant?: 'hero' | 'header'
  className?: string
}

export function AnorepLogo({ variant = 'hero', className = '' }: AnorepLogoProps) {
  return (
    <img
      alt="ANOREP logo"
      className={`anorep-logo anorep-logo--${variant} ${className}`.trim()}
      src={`${import.meta.env.BASE_URL}anorep-logo.png`}
    />
  )
}
