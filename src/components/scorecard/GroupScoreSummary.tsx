import type { Score, Hole } from '@/types'
import { Card } from '@/components/ui'
import { formatVsPar, calculateTotalVsPar, calculateTotalNetVsPar } from '@/lib/scoring'

interface Props {
  scores: Score[]
  holes: Hole[]
  isNet: boolean
}

export function GroupScoreSummary({ scores, holes, isNet }: Props) {
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

          return (
            <div key={sc.golferId} className="flex items-center justify-between">
              <div>
                <span className="font-medium text-sm text-white">{sc.golferName}</span>
                <span className="text-xs text-gray-500 ml-1">({holesPlayed}/18)</span>
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
