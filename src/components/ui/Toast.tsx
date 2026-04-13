import { useEffect } from 'react'

interface Props {
  message: string
  onDone: () => void
  duration?: number
}

export function Toast({ message, onDone, duration = 2500 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [onDone, duration])

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-brand text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg pointer-events-none animate-fade-in">
      {message}
    </div>
  )
}
