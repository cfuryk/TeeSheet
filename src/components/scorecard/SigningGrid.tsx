import type { Score, Hole } from '@/types'
import { Button, Badge } from '@/components/ui'
import { formatVsPar, calculateTotalVsPar } from '@/lib/scoring'
import { scoreVsPar } from '@/lib/scoring'

interface Props {
  scores: Score[]
  holes: Hole[]
  currentUserId: string
  onSign: (uid: string) => void
  signing: string | null
}

export function SigningGrid({ scores, holes, currentUserId, onSign, signing }: Props) {
  const sorted = [...holes].sort((a, b) => a.number - b.number)
  const front = sorted.slice(0, 9)
  const back = sorted.slice(9, 18)

  function getScore(sc: Score, holeNum: number) {
    return sc.scores.find((s) => s.hole === holeNum)
  }

  const signedCount = scores.filter((sc) => sc.isLocked).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Scorecard Review</h3>
        <span className="text-sm text-gray-400">{signedCount}/{scores.length} signed</span>
      </div>

      {[front, back].map((group, gi) => (
        <div key={gi} className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-xs border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-2 text-left border border-gray-600 w-28 text-gray-300">Golfer</th>
                {group.map((h) => (
                  <th key={h.number} className="p-2 text-center border border-gray-600 min-w-[2rem] text-gray-300">
                    {h.number}
                  </th>
                ))}
                <th className="p-2 text-center border border-gray-600 font-bold text-gray-300">{gi === 0 ? 'OUT' : 'IN'}</th>
                {gi === 1 && <th className="p-2 text-center border border-gray-600 font-bold text-gray-300">TOT</th>}
              </tr>
              <tr className="text-gray-500">
                <td className="p-2 border border-gray-600">Par</td>
                {group.map((h) => (
                  <td key={h.number} className="p-2 text-center border border-gray-600">{h.par}</td>
                ))}
                <td className="p-2 text-center border border-gray-600 font-bold">
                  {group.reduce((s, h) => s + h.par, 0)}
                </td>
                {gi === 1 && (
                  <td className="p-2 text-center border border-gray-600 font-bold">
                    {sorted.reduce((s, h) => s + h.par, 0)}
                  </td>
                )}
              </tr>
            </thead>
            <tbody>
              {scores.map((sc) => {
                const halfTotal = group.reduce((sum, h) => {
                  const s = getScore(sc, h.number)
                  return sum + (s?.grossScore ?? 0)
                }, 0)
                const totalVsPar = gi === 1 ? calculateTotalVsPar(sc.scores, holes) : null

                return (
                  <tr key={sc.golferId} className={sc.isLocked ? 'bg-green-900/20' : ''}>
                    <td className="p-2 border border-gray-600">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-white">{sc.golferName}</span>
                        {sc.isLocked ? (
                          <Badge label="Signed ✓" variant="green" />
                        ) : sc.golferId === currentUserId ? (
                          <Button
                            size="sm"
                            loading={signing === sc.golferId}
                            onClick={() => onSign(sc.golferId)}
                            className="text-xs py-0.5 px-2"
                          >
                            Sign Card
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500">Awaiting sign</span>
                        )}
                      </div>
                    </td>
                    {group.map((h) => {
                      const s = getScore(sc, h.number)
                      const vp = s ? scoreVsPar(s.grossScore, h.par) : null
                      return (
                        <td
                          key={h.number}
                          className={`p-2 text-center border border-gray-600 font-mono ${
                            vp === null ? 'text-gray-600' :
                            vp <= -2 ? 'text-blue-400 font-bold' :
                            vp === -1 ? 'text-red-400 font-bold' :
                            vp === 0 ? 'text-gray-200' :
                            vp === 1 ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {s ? s.grossScore : '-'}
                        </td>
                      )
                    })}
                    <td className="p-2 text-center border border-gray-600 font-bold text-white">
                      {halfTotal || '-'}
                    </td>
                    {gi === 1 && (
                      <td className="p-2 text-center border border-gray-600 font-bold text-white">
                        <div>{sc.totalGross ?? '-'}</div>
                        {totalVsPar !== null && (
                          <div className="text-xs text-gray-400">{formatVsPar(totalVsPar)}</div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
