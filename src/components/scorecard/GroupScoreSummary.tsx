import type { Score, Hole } from '@/types'
import { Card } from '@/components/ui'
import { formatVsPar, calculateTotalVsPar, calculateTotalNetVsPar } from '@/lib/scoring'

interface Props {
  scores: Score[]
  holes: Hole[]
  isNet: boolean
  currentHole?: number
}

export function GroupScoreSummary({ scores, holes, isNet, currentHole }: Props) {
  if (scores.length === 0) return null

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-400 mb-3 text-sm uppercase tracking-wide">Group Scores</h3>
      <div className="flex flex-col gap-2">
        {scores.map((sc) => {
          const holesPlayed = sc.scores.length
          const gross = sc.scores.reduce((s, h) => s + h.grossScore, 0)
          const net = sc.scores.reduce((s, h) => s + h.netScore, 0)
          const vsParGross = calculateTotalVsPar(sc.scores, holes)
          const vsParNet = calculateTotalNetVsPar(sc.scores, holes)
          const strokesOnCurrentHole = currentHole !== undefined
            ? (sc.strokeAllocation[currentHole - 1] ?? 0)
            : 0

          return (
            <div key={sc.golferId} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm text-white">{sc.golferName}</span>
                {isNet && strokesOnCurrentHole > 0 && (
                  <span className="flex gap-0.5">
                    {Array.from({ length: strokesOnCurrentHole }).map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    ))}
                  </span>
                )}
                <span className="text-xs text-gray-500">({holesPlayed}/18)</span>
              </div>
              <div className="flex gap-3 items-center">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Gross</p>
                  <p className="font-bold text-white">{holesPlayed > 0 ? gross : '-'}</p>
                  {holesPlayed > 0 && <p className="text-xs text-gray-500">{formatVsPar(vsParGross)}</p>}
                </div>
                {isNet && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Net</p>
                    <p className="font-bold text-green-400">{holesPlayed > 0 ? net : '-'}</p>
                    {holesPlayed > 0 && <p className="text-xs text-gray-500">{formatVsPar(vsParNet)}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
