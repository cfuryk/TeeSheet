import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: Props) {
  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      {children}
    </div>
  )
}
