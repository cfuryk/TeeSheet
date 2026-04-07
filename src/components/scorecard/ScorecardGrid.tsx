import type { Score, Hole } from '@/types'
import { Card } from '@/components/ui'
import { scoreVsPar, bestBallHoleScore } from '@/lib/scoring'

interface Props {
  scores: Score[]
  holes: Hole[]
  isNet: boolean
  showBestBall?: boolean
}

export function ScorecardGrid({ scores, holes, isNet, showBestBall = false }: Props) {
  const sorted = [...holes].sort((a, b) => a.number - b.number)
  const front = sorted.slice(0, 9)
  const back = sorted.slice(9, 18)

  function getScore(sc: Score, holeNum: number) {
    return sc.scores.find((s) => s.hole === holeNum)
  }

  function halfTotal(sc: Score, group: Hole[], type: 'gross' | 'net') {
    return group.reduce((sum, h) => {
      const s = getScore(sc, h.number)
      return sum + (s ? (type === 'net' ? s.netScore : s.grossScore) : 0)
    }, 0)
  }

  function renderGroup(group: Hole[], label: 'OUT' | 'IN') {
    return (
      <table className="w-full text-xs border-collapse table-fixed">
        <thead>
          <tr className="bg-gray-700">
            <th className="p-2 text-left border border-gray-600 text-gray-300 w-10">Hole</th>
            <th className="p-2 text-center border border-gray-600 text-gray-300 w-10">Par</th>
            {scores.map((sc) => (
              <th key={sc.golferId} className="p-2 text-center border border-gray-600 text-gray-300 truncate">
                {sc.golferName}
              </th>
            ))}
            {showBestBall && (
              <th className="p-2 text-center border border-gray-600 text-green-400 font-semibold">
                Best Ball
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {group.map((h) => {
            const bbScore = showBestBall ? bestBallHoleScore(scores, h.number, isNet) : null
            const bbVsPar = bbScore !== null ? scoreVsPar(bbScore, h.par) : null
            return (
              <tr key={h.number} className="odd:bg-gray-800 even:bg-gray-750">
                <td className="p-2 text-center border border-gray-600 font-medium text-gray-300">{h.number}</td>
                <td className="p-2 text-center border border-gray-600 text-gray-500">{h.par}</td>
                {scores.map((sc) => {
                  const s = getScore(sc, h.number)
                  const grossScore = s?.grossScore ?? null
                  const netScoreVal = s?.netScore ?? null
                  const displayScore = isNet ? netScoreVal : grossScore
                  const displayVp = s ? scoreVsPar(isNet ? s.netScore : s.grossScore, h.par) : null
                  const holeIdx = h.number - 1
                  const strokes = sc.strokeAllocation?.[holeIdx] ?? 0
                  return (
                    <td key={sc.golferId} className="relative p-2 text-center border border-gray-600">
                      {isNet && strokes > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400" />
                      )}
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={isNet && grossScore !== null ? grossScore : displayScore} vsPar={displayVp} />
                      </div>
                    </td>
                  )
                })}
                {showBestBall && (
                  <td className="p-2 text-center border border-gray-600 bg-green-500/5">
                    <div className="flex items-center justify-center">
                      <ScoreBadge score={bbScore} vsPar={bbVsPar} />
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
          {/* Totals row */}
          <tr className="bg-gray-700 font-bold">
            <td className="p-2 text-center border border-gray-600 text-gray-300">{label}</td>
            <td className="p-2 text-center border border-gray-600 text-gray-400">
              {group.reduce((s, h) => s + h.par, 0)}
            </td>
            {scores.map((sc) => (
              <td key={sc.golferId} className="p-2 text-center border border-gray-600 text-white">
                {halfTotal(sc, group, 'gross')}
              </td>
            ))}
            {showBestBall && (
              <td className="p-2 text-center border border-gray-600 text-green-400 bg-green-500/5">
                {group.reduce((sum, h) => {
                  const bb = bestBallHoleScore(scores, h.number, isNet)
                  return sum + (bb ?? 0)
                }, 0)}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    )
  }

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="font-semibold text-gray-300">Full Scorecard</h3>
      {renderGroup(front, 'OUT')}
      {back.length > 0 && renderGroup(back, 'IN')}
    </Card>
  )
}

function ScoreBadge({ score, vsPar }: { score: number | null; vsPar: number | null }) {
  if (score === null || vsPar === null) {
    return <span className="font-mono text-gray-600">-</span>
  }
  if (vsPar <= -2) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 font-mono font-semibold text-red-400 rounded-full ring-2 ring-red-400 ring-offset-2 ring-offset-gray-800 outline outline-2 outline-red-400 outline-offset-[-6px]">
        {score}
      </span>
    )
  }
  if (vsPar === -1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 font-mono font-semibold text-red-400 rounded-full ring-2 ring-red-400">
        {score}
      </span>
    )
  }
  if (vsPar === 0) {
    return <span className="inline-flex items-center justify-center w-7 h-7 font-mono font-semibold text-gray-200">{score}</span>
  }
  if (vsPar === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 font-mono font-semibold text-blue-400 ring-2 ring-blue-400">
        {score}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 font-mono font-semibold text-blue-400 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-800 outline outline-2 outline-blue-400 outline-offset-[-6px]">
      {score}
    </span>
  )
}

