import { clsx } from 'clsx'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
  error: 'btn btn-error',
  success: 'btn btn-success',
  outline: 'btn btn-outline',
}

const sizes = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

export function Button({ children, variant = 'primary', size = 'md', className, loading, disabled, type = 'button', href, ...props }) {
  const classNames = clsx('btn', variants[variant], sizes[size], loading && 'loading', className)
  
  if (href) {
    return <Link to={href} className={classNames} {...props}>{children}</Link>
  }
  
  return (
    <button type={type} className={classNames} disabled={disabled || loading} {...props}>
      {children}
    </button>
  )
}