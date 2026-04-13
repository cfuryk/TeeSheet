interface Props {
  message: string
  type?: 'error' | 'success' | 'info'
}

const typeClasses = {
  error: 'bg-red-50 text-danger border-red-200',
  success: 'bg-brand/10 text-brand border-brand/20',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
}

export function Alert({ message, type = 'error' }: Props) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${typeClasses[type]}`}>
      {message}
    </div>
  )
}
