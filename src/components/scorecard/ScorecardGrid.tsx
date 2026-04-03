import type { Score, Hole } from '@/types'
import { Card } from '@/components/ui'
import { scoreVsPar } from '@/lib/scoring'

interface Props {
  scores: Score[]
  holes: Hole[]
  isNet: boolean
}

export function ScorecardGrid({ scores, holes, isNet }: Props) {
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
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-700">
            <th className="p-2 text-left border border-gray-600 text-gray-300 w-10">Hole</th>
            <th className="p-2 text-center border border-gray-600 text-gray-300 w-10">Par</th>
            {scores.map((sc) => (
              <th key={sc.golferId} className="p-2 text-center border border-gray-600 text-gray-300">
                {sc.golferName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {group.map((h) => (
            <tr key={h.number} className="odd:bg-gray-800 even:bg-gray-750">
              <td className="p-2 text-center border border-gray-600 font-medium text-gray-300">{h.number}</td>
              <td className="p-2 text-center border border-gray-600 text-gray-500">{h.par}</td>
              {scores.map((sc) => {
                const s = getScore(sc, h.number)
                const vp = s ? scoreVsPar(s.grossScore, h.par) : null
                return (
                  <td
                    key={sc.golferId}
                    className={`p-2 text-center border border-gray-600 font-mono ${
                      vp === null ? 'text-gray-600' :
                      vp <= -2 ? 'text-blue-400 font-bold' :
                      vp === -1 ? 'text-red-400 font-bold' :
                      vp === 0 ? 'text-gray-200' :
                      vp === 1 ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {s ? s.grossScore : '-'}
                    {isNet && s ? <span className="block text-green-400 text-[10px]">{s.netScore}</span> : null}
                  </td>
                )
              })}
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-gray-700 font-bold">
            <td className="p-2 text-center border border-gray-600 text-gray-300">{label}</td>
            <td className="p-2 text-center border border-gray-600 text-gray-400">
              {group.reduce((s, h) => s + h.par, 0)}
            </td>
            {scores.map((sc) => (
              <td key={sc.golferId} className="p-2 text-center border border-gray-600 text-white">
                {halfTotal(sc, group, 'gross')}
                {isNet ? (
                  <span className="block text-green-400 text-[10px]">{halfTotal(sc, group, 'net')}</span>
                ) : null}
              </td>
            ))}
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
