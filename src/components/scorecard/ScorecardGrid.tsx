import type { Score, Hole } from '@/types'
import { scoreVsPar, bestBallHoleScore } from '@/lib/scoring'

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}. ${parts[parts.length - 1]}`
  if (parts.length === 1 && parts[0].length > 0) return parts[0]
  return full
}

interface Props {
  scores: Score[]
  holes: Hole[]
  isNet: boolean
  showBestBall?: boolean
  bare?: boolean
  fullNames?: boolean
}

export function ScorecardGrid({ scores, holes, isNet, showBestBall = false, bare = false, fullNames = false }: Props) {
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

  function renderGroup(group: Hole[], label: 'OUT' | 'IN', topBorder = false) {
    return (
      <table className={`w-full text-xs table-fixed border-collapse ${topBorder ? 'border-t border-card-border' : ''}`}>
        <thead>
          <tr className="bg-card-bg divide-x divide-card-border border-b border-card-border">
            <th className="p-2 text-left text-brand w-10">Hole</th>
            <th className="p-2 text-center text-brand w-10">Par</th>
            {scores.map((sc) => (
              <th key={sc.golferId} className="p-2 text-center text-brand truncate">
                {fullNames ? sc.golferName : shortName(sc.golferName)}
              </th>
            ))}
            {showBestBall && (
              <th className="p-2 text-center text-brand font-semibold">Best Ball</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {group.map((h) => {
            const bbScore = showBestBall ? bestBallHoleScore(scores, h.number, isNet) : null
            const bbVsPar = bbScore !== null ? scoreVsPar(bbScore, h.par) : null
            return (
              <tr key={h.number} className="odd:bg-white even:bg-gray-50 h-10 divide-x divide-card-border">
                <td className="p-2 text-center font-medium text-brand">{h.number}</td>
                <td className="p-2 text-center text-muted">{h.par}</td>
                {scores.map((sc) => {
                  const s = getScore(sc, h.number)
                  const grossScore = s?.grossScore ?? null
                  const netScoreVal = s?.netScore ?? null
                  const displayScore = isNet ? netScoreVal : grossScore
                  const displayVp = s ? scoreVsPar(isNet ? s.netScore : s.grossScore, h.par) : null
                  const holeIdx = h.number - 1
                  const strokes = sc.strokeAllocation?.[holeIdx] ?? 0
                  return (
                    <td key={sc.golferId} className="relative py-1 px-0 text-center">
                      {isNet && strokes > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand" />
                      )}
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={isNet && grossScore !== null ? grossScore : displayScore} vsPar={displayVp} />
                      </div>
                    </td>
                  )
                })}
                {showBestBall && (
                  <td className="py-1 px-0 text-center bg-brand/5">
                    <div className="flex items-center justify-center">
                      <ScoreBadge score={bbScore} vsPar={bbVsPar} />
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
          {/* Totals row */}
          <tr className="bg-card-bg font-bold divide-x divide-card-border border-t border-card-border">
            <td className="p-2 text-center text-brand">{label}</td>
            <td className="p-2 text-center text-muted">{group.reduce((s, h) => s + h.par, 0)}</td>
            {scores.map((sc) => (
              <td key={sc.golferId} className="p-2 text-center text-brand">
                {halfTotal(sc, group, 'gross')}
              </td>
            ))}
            {showBestBall && (
              <td className="p-2 text-center text-brand bg-brand/5">
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

  function renderTotals() {
    const totalPar = sorted.reduce((s, h) => s + h.par, 0)
    return (
      <table className="w-full text-xs table-fixed border-collapse border-t border-card-border">
        <tbody>
          <tr className="bg-card-bg font-bold divide-x divide-card-border">
            <td className="p-2 text-center text-brand w-10">TOT</td>
            <td className="p-2 text-center text-muted w-10">{totalPar}</td>
            {scores.map((sc) => {
              const total = sc.scores.reduce((s, h) => s + h.grossScore, 0)
              const vsPar = sc.scores.length > 0
                ? sc.scores.reduce((sum, hs) => {
                    const h = sorted.find((hole) => hole.number === hs.hole)
                    return sum + (h ? hs.grossScore - h.par : 0)
                  }, 0)
                : null
              return (
                <td key={sc.golferId} className="p-2 text-center">
                  {sc.scores.length > 0 ? (
                    <span className={`font-bold ${vsPar !== null && vsPar < 0 ? 'text-danger' : vsPar !== null && vsPar > 0 ? 'text-[#3A6280]' : 'text-brand'}`}>
                      {total}
                    </span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
              )
            })}
            {showBestBall && <td className="p-2 text-center bg-brand/5" />}
          </tr>
        </tbody>
      </table>
    )
  }

  if (bare) {
    return (
      <div className="rounded-xl overflow-hidden border border-card-border">
        {renderGroup(front, 'OUT')}
        {back.length > 0 && renderGroup(back, 'IN', true)}
        {renderTotals()}
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h3 className="font-semibold text-muted">Full Scorecard</h3>
      {renderGroup(front, 'OUT')}
      {back.length > 0 && renderGroup(back, 'IN')}
      {renderTotals()}
    </div>
  )
}

function ScoreBadge({ score, vsPar }: { score: number | null; vsPar: number | null }) {
  if (score === null || vsPar === null) {
    return <span className="inline-flex items-center justify-center w-8 h-8 font-mono text-muted">-</span>
  }
  if (vsPar <= -2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 font-mono font-semibold text-danger rounded-full ring-2 ring-danger ring-offset-[3px] ring-offset-white outline outline-2 outline-danger outline-offset-[-3px]">
        {score}
      </span>
    )
  }
  if (vsPar === -1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 font-mono font-semibold text-danger rounded-full ring-2 ring-danger">
        {score}
      </span>
    )
  }
  if (vsPar === 0) {
    return <span className="inline-flex items-center justify-center w-7 h-7 font-mono font-semibold text-brand">{score}</span>
  }
  if (vsPar === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 font-mono font-semibold text-[#3A6280] ring-2 ring-[#3A6280]">
        {score}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 font-mono font-semibold text-[#3A6280] ring-2 ring-[#3A6280] ring-offset-[3px] ring-offset-white outline outline-2 outline-[#3A6280] outline-offset-[-3px]">
      {score}
    </span>
  )
}

