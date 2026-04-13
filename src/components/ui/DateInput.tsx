import { useMemo } from 'react'
import { SelectField } from './SelectField'

interface Props {
  label?: string
  error?: string
  value?: string       // "YYYY-MM-DD"
  onChange?: (value: string) => void
  minToday?: boolean   // when true, past dates are disabled
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function DateInput({ label, error, value = '', onChange, minToday = false }: Props) {
  const [yearStr, monthStr, dayStr] = value ? value.split('-') : ['', '', '']
  const year = yearStr ? parseInt(yearStr) : null
  const month = monthStr ? parseInt(monthStr) : null

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  const currentYear = todayYear
  const yearOptions = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => {
      const y = currentYear + i
      return { value: String(y), label: String(y) }
    }), [currentYear])

  const monthOptions = MONTHS.map((m, i) => {
    const mNum = i + 1
    const disabled = minToday && year === todayYear && mNum < todayMonth
    return { value: pad(mNum), label: m, disabled }
  })

  const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31
  const dayOptions = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const disabled = minToday && year === todayYear && month === todayMonth && d < todayDay
      return { value: pad(d), label: String(d), disabled }
    }), [daysInMonth, minToday, year, month, todayYear, todayMonth, todayDay])

  function emit(y: string, m: string, d: string) {
    if (y && m && d) onChange?.(`${y}-${m}-${d}`)
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-brand">{label}</label>}
      <div className="flex gap-2">
        <SelectField
          options={monthOptions}
          placeholder="Month"
          value={monthStr || ''}
          onChange={(m) => emit(yearStr, m, dayStr)}
          className="flex-1"
        />
        <SelectField
          options={dayOptions}
          placeholder="Day"
          value={dayStr || ''}
          onChange={(d) => emit(yearStr, monthStr, d)}
          className="w-24"
        />
        <SelectField
          options={yearOptions}
          placeholder="Year"
          value={yearStr || ''}
          onChange={(y) => emit(y, monthStr, dayStr)}
          className="w-28"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
