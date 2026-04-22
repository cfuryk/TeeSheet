import { useNavigate } from 'react-router-dom'
import type { Score, Hole } from '@/types'
import { buildLeaderboard, formatVsPar } from '@/lib/scoring'
import { usePanelState } from '@/hooks/usePanelState'

interface Props {
  scores: Score[]
  holes: Hole[]
  isNet: boolean
  roundId: string
  groupId: string
}

function thruLabel(holesPlayed: number, isLocked?: boolean) {
  if (holesPlayed === 0) return '-'
  if (holesPlayed === 18 && isLocked) return 'F'
  return `${holesPlayed}`
}

export function GroupScoreSummary({ scores, holes, isNet, roundId, groupId }: Props) {
  const [open, toggle] = usePanelState('leaderboard')
  const navigate = useNavigate()

  if (scores.length === 0) return null

  const leaderboard = buildLeaderboard(scores, holes, isNet)
  const top5 = leaderboard.slice(0, 5)

  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-card-bg transition-colors"
      >
        <span className="text-sm font-semibold text-brand">Leaderboard</span>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-card-border">
          <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
            {/* Column headers */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                <p className="text-xs text-muted uppercase tracking-wide w-6 shrink-0 text-center">Pos</p>
                <p className="text-xs text-muted uppercase tracking-wide">Player</p>
              </div>
              <div className="flex gap-4 text-center">
                <p className="text-xs text-muted uppercase tracking-wide w-10">Round</p>
                <p className="text-xs text-muted uppercase tracking-wide w-10">Thru</p>
                <p className="text-xs text-muted uppercase tracking-wide w-10">Total</p>
              </div>
            </div>
            {top5.map(({ score: sc, vsPar, holesPlayed, rankLabel }) => {
              const gross = sc.scores.reduce((s, h) => s + h.grossScore, 0)
              const vsParColor = vsPar !== null && vsPar < 0 ? 'text-danger' : vsPar !== null && vsPar > 0 ? 'text-[#3A6280]' : 'text-brand'
              return (
                <div key={sc.golferId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <span className="text-xs font-bold text-muted w-6 shrink-0 text-center">{rankLabel}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-brand text-sm leading-tight truncate">{sc.golferName}</p>
                      {isNet && <p className="text-xs text-muted">HCP: {sc.courseHandicap}</p>}
                    </div>
                  </div>
                  <div className="flex gap-4 text-center">
                    <p className={`text-sm font-bold w-10 ${vsPar !== null ? vsParColor : 'text-muted'}`}>
                      {vsPar !== null ? formatVsPar(vsPar) : '-'}
                    </p>
                    <p className="text-sm font-bold text-brand w-10">{thruLabel(holesPlayed, sc.isLocked)}</p>
                    <p className="text-sm font-bold text-brand w-10">{holesPlayed > 0 ? gross : '-'}</p>
                  </div>
                </div>
              )
            })}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate(`/rounds/${roundId}/summary?from=scorecard&groupId=${groupId}`)}
                className="w-full h-9 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold text-sm transition-colors"
              >
                Full Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
