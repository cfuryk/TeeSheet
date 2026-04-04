import { Timestamp } from 'firebase/firestore'

/** Parse "YYYY-MM-DD" as local midnight to avoid UTC offset shifting the date back a day. */
export function localDateFromString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(ts: Timestamp | string | Date): string {
  const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatDateTime(ts: Timestamp | string | Date): string {
  const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatHandicap(h: number): string {
  if (h < 0) return `+${Math.abs(h).toFixed(1)}`
  return h.toFixed(1)
}

export function roundTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    STROKE_GROSS: 'Stroke (Gross)',
    STROKE_NET: 'Stroke (Net)',
    BEST_BALL_GROSS: '2-Man Best Ball (Gross)',
    BEST_BALL_NET: '2-Man Best Ball (Net)',
    TWO_TEAM_STROKE_GROSS: 'Two Team Stroke (Gross)',
    TWO_TEAM_STROKE_NET: 'Two Team Stroke (Net)',
    TWO_TEAM_BB_MATCH_GROSS: 'Two Team BB Match (Gross)',
    TWO_TEAM_BB_MATCH_NET: 'Two Team BB Match (Net)',
    TWO_TEAM_BB_STROKE_GROSS: 'Two Team BB Stroke (Gross)',
    TWO_TEAM_BB_STROKE_NET: 'Two Team BB Stroke (Net)',
  }
  return labels[type] ?? type
}
