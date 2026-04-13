import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: Props) {
  return (
    <div className={`bg-card-bg rounded-xl border border-card-border ${className}`}>
      {children}
    </div>
  )
}
