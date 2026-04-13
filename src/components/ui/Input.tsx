import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-brand">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`rounded-lg border bg-white px-3 py-2 text-base text-brand placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand ${
            error ? 'border-red-500' : 'border-card-border'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
