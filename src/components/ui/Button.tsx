import { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const variantClasses = {
  primary: 'bg-brand text-white hover:bg-brand-hover disabled:opacity-50',
  secondary: 'bg-btn-secondary text-brand hover:bg-btn-secondary-hover disabled:opacity-50',
  danger: 'bg-danger text-white hover:bg-danger-hover disabled:opacity-50',
  ghost: 'bg-transparent text-brand hover:bg-btn-secondary disabled:opacity-50',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-6 py-3 text-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? <span className="animate-pulse">Loading...</span> : children}
    </button>
  )
}
