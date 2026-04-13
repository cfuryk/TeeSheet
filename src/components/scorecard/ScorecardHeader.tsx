import type { Round } from '@/types'

interface Props {
  round: Round
  currentHole?: number
  totalHoles?: number
}

export function ScorecardHeader({ round, currentHole, totalHoles }: Props) {
  return (
    <div className="flex items-center justify-between px-1">
      <h1 className="text-xl font-bold text-brand">{round.courseName}</h1>
      {currentHole && totalHoles && (
        <span className="text-sm bg-brand/10 text-brand rounded-full px-3 py-0.5 font-semibold">
          Hole {currentHole}/{totalHoles}
        </span>
      )}
    </div>
  )
}
