interface Props {
  message: string
  type?: 'error' | 'success' | 'info'
}

const typeClasses = {
  error: 'bg-red-900/50 text-red-300 border-red-700',
  success: 'bg-green-900/50 text-green-300 border-green-700',
  info: 'bg-blue-900/50 text-blue-300 border-blue-700',
}

export function Alert({ message, type = 'error' }: Props) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${typeClasses[type]}`}>
      {message}
    </div>
  )
}
