import type { Round } from '@/types'
import { roundTypeLabel, formatDate } from '@/lib/formatters'

interface Props {
  round: Round
  currentHole?: number
  totalHoles?: number
}

export function ScorecardHeader({ round, currentHole, totalHoles }: Props) {
  return (
    <div className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-lg">{round.courseName}</p>
        {currentHole && totalHoles && (
          <span className="text-sm bg-gray-700 rounded-full px-3 py-0.5 text-gray-300">
            Hole {currentHole}/{totalHoles}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
        <span>{round.teeName} tees</span>
        <span>·</span>
        <span>{roundTypeLabel(round.roundType)}</span>
        <span>·</span>
        <span>{formatDate(round.date)}</span>
      </div>
    </div>
  )
}
