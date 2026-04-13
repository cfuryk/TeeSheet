import type React from 'react'

interface Props {
  label: string
  variant?: 'green' | 'gray' | 'blue' | 'red' | 'yellow' | 'purple' | 'tan'
}

const variantClasses = {
  green: 'bg-brand/10 text-brand',
  gray: 'bg-card-bg text-muted border border-card-border',
  blue: '',
  red: 'bg-red-100 text-danger',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  tan: '',
}

const variantStyles: Partial<Record<string, React.CSSProperties>> = {
  blue: { backgroundColor: '#3A6280', color: '#ffffff' },
  tan:  { backgroundColor: '#e1caad', color: '#978165' },
}

export function Badge({ label, variant = 'gray' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]}`}
      style={variantStyles[variant ?? 'gray']}
    >
      {label}
    </span>
  )
}
