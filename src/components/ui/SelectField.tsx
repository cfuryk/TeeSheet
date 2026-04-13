import { useState, useRef, useEffect, forwardRef, useImperativeHandle, ReactNode } from 'react'

interface Option {
  value: string
  label: string
  disabled?: boolean
}

interface Props {
  label?: string
  error?: string
  options: Option[]
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  dropdownFooter?: (close: () => void) => ReactNode
  colorScheme?: 'green' | 'blue'
}

export const SelectField = forwardRef<HTMLButtonElement, Props>(
  ({ label, error, options, placeholder = 'Select…', value, onChange, disabled, className = '', id, dropdownFooter, colorScheme = 'green' }, ref) => {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    useImperativeHandle(ref, () => buttonRef.current!)

    const selected = options.find((o) => o.value === value)
    const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-')

    // Close on outside click
    useEffect(() => {
      function handleClick(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    function handleSelect(val: string, optDisabled?: boolean) {
      if (optDisabled) return
      onChange?.(val)
      setOpen(false)
    }

    return (
      <div className={`flex flex-col gap-1 ${className}`} ref={containerRef}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-brand">
            {label}
          </label>
        )}
        <div className="relative">
          <button
            ref={buttonRef}
            id={selectId}
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-base text-left focus:outline-none focus:ring-2 ${colorScheme === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-brand'} transition-colors ${
              error ? 'border-red-500' : 'border-card-border'
            } ${disabled ? 'bg-white text-muted cursor-not-allowed' : 'bg-white text-brand hover:border-muted cursor-pointer'}`}
          >
            <span className={selected ? 'text-brand' : 'text-muted'}>
              {selected ? selected.label : placeholder}
            </span>
            <svg
              className={`w-4 h-4 text-muted transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <ul className="absolute z-50 mt-1 w-full rounded-lg border border-card-border bg-white shadow-xl overflow-auto max-h-60 py-1">
              {options.length === 0 && !dropdownFooter ? (
                <li className="px-3 py-2 text-sm text-muted">No options</li>
              ) : (
                options.map((opt) => (
                  <li
                    key={opt.value}
                    onMouseDown={() => handleSelect(opt.value, opt.disabled)}
                    className={`px-3 py-2 text-sm transition-colors ${
                      opt.disabled
                        ? 'text-card-border cursor-not-allowed'
                        : opt.value === value
                        ? colorScheme === 'blue' ? 'bg-blue-600 text-white cursor-pointer' : 'bg-brand text-white cursor-pointer'
                        : 'text-brand hover:bg-card-bg cursor-pointer'
                    }`}
                  >
                    {opt.label}
                  </li>
                ))
              )}
              {dropdownFooter && (
                <>
                  {options.length > 0 && <li className="border-t border-card-border my-1" />}
                  <li>{dropdownFooter(() => setOpen(false))}</li>
                </>
              )}
            </ul>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  },
)
SelectField.displayName = 'SelectField'
