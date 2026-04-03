import { useMemo } from 'react'
import { SelectField } from './SelectField'

interface Props {
  label?: string
  error?: string
  value?: string       // "YYYY-MM-DDTHH:mm"
  onChange?: (value: string) => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: pad(i),
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`,
}))

const minuteOptions = ['00', '15', '30', '45'].map((m) => ({ value: m, label: `:${m}` }))

export function DateTimeInput({ label, error, value = '', onChange }: Props) {
  const [datePart = '', timePart = ''] = value.includes('T') ? value.split('T') : [value, '']
  const [yearStr = '', monthStr = '', dayStr = ''] = datePart ? datePart.split('-') : []
  const [hourStr = '', minuteStr = ''] = timePart ? timePart.split(':') : []

  const year = yearStr ? parseInt(yearStr) : null
  const month = monthStr ? parseInt(monthStr) : null

  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => {
      const y = currentYear + i
      return { value: String(y), label: String(y) }
    }), [currentYear])

  const monthOptions = MONTHS.map((m, i) => ({
    value: pad(i + 1),
    label: m,
  }))

  const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31
  const dayOptions = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) => ({
      value: pad(i + 1),
      label: String(i + 1),
    })), [daysInMonth])

  function emitDate(y: string, m: string, d: string) {
    const date = (y && m && d) ? `${y}-${m}-${d}` : datePart
    const time = (hourStr && minuteStr) ? `${hourStr}:${minuteStr}` : timePart
    if (date && time) onChange?.(`${date}T${time}`)
  }

  function emitTime(h: string, min: string) {
    if (datePart && h && min) onChange?.(`${datePart}T${h}:${min}`)
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <SelectField
            options={monthOptions}
            placeholder="Month"
            value={monthStr}
            onChange={(m) => emitDate(yearStr, m, dayStr)}
            className="flex-1"
          />
          <SelectField
            options={dayOptions}
            placeholder="Day"
            value={dayStr}
            onChange={(d) => emitDate(yearStr, monthStr, d)}
            className="w-20"
          />
          <SelectField
            options={yearOptions}
            placeholder="Year"
            value={yearStr}
            onChange={(y) => emitDate(y, monthStr, dayStr)}
            className="w-28"
          />
        </div>
        <div className="flex gap-2">
          <SelectField
            options={hourOptions}
            placeholder="Hour"
            value={hourStr}
            onChange={(h) => emitTime(h, minuteStr || '00')}
            className="flex-1"
          />
          <SelectField
            options={minuteOptions}
            placeholder="Min"
            value={minuteStr}
            onChange={(min) => emitTime(hourStr || '00', min)}
            className="w-24"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
