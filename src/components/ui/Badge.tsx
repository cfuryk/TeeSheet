interface Props {
  label: string
  variant?: 'green' | 'gray' | 'blue' | 'red' | 'yellow'
}

const variantClasses = {
  green: 'bg-green-900/60 text-green-400',
  gray: 'bg-gray-700/80 text-gray-300 border border-gray-600',
  blue: 'bg-blue-900/60 text-blue-400',
  red: 'bg-red-900/60 text-red-400',
  yellow: 'bg-yellow-900/60 text-yellow-400',
}

export function Badge({ label, variant = 'gray' }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]}`}>
      {label}
    </span>
  )
}
