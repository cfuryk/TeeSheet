import { useNavigate } from 'react-router-dom'
import type { Score, Group, Hole } from '@/types'
import { formatVsPar } from '@/lib/scoring'
import { usePanelState } from '@/hooks/usePanelState'

interface Props {
  groups: Group[]
  allScores: Score[]
  holes: Hole[]
  roundId: string
  groupId: string
}

function thruLabel(holesPlayed: number, isLocked?: boolean) {
  if (holesPlayed === 0) return '-'
  if (holesPlayed === 18 && isLocked) return 'F'
  return `${holesPlayed}`
}

export function ScrambleScoreSummary({ groups, allScores, holes, roundId, groupId }: Props) {
  const [open, toggle] = usePanelState('scramble-leaderboard')
  const navigate = useNavigate()

  const rows = groups
    .map((group, i) => {
      const adminId = group.groupAdminId ?? group.golferIds[0]
      const score = allScores.find((s) => s.golferId === adminId)
      const holesPlayed = score?.scores.length ?? 0
      const total = holesPlayed > 0 ? score!.scores.reduce((s, h) => s + h.grossScore, 0) : null
      const parPlayed = holesPlayed > 0
        ? score!.scores.reduce((s, h) => {
            const hole = holes.find((hd) => hd.number === h.hole)
            return s + (hole?.par ?? 0)
          }, 0)
        : null
      const vsPar = total !== null && parPlayed !== null ? total - parPlayed : null
      return { group, adminId, score, holesPlayed, total, vsPar, fallbackName: `Group ${i + 1}` }
    })
    .sort((a, b) => {
      if (a.vsPar === null && b.vsPar === null) return b.holesPlayed - a.holesPlayed
      if (a.vsPar === null) return 1
      if (b.vsPar === null) return -1
      if (a.vsPar !== b.vsPar) return a.vsPar - b.vsPar
      return b.holesPlayed - a.holesPlayed
    })

  if (rows.length === 0) return null

  const top5 = rows.slice(0, 5)

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
                <p className="text-xs text-muted uppercase tracking-wide">Team</p>
              </div>
              <div className="flex gap-4 text-center">
                <p className="text-xs text-muted uppercase tracking-wide w-10">Round</p>
                <p className="text-xs text-muted uppercase tracking-wide w-10">Thru</p>
                <p className="text-xs text-muted uppercase tracking-wide w-10">Total</p>
              </div>
            </div>

            {top5.map(({ group, score, holesPlayed, total, vsPar, fallbackName }, i) => {
              const vsParColor = vsPar !== null && vsPar < 0
                ? 'text-danger'
                : vsPar !== null && vsPar > 0
                ? 'text-[#3A6280]'
                : 'text-brand'
              return (
                <div key={group.groupId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <span className="text-xs font-bold text-muted w-6 shrink-0 text-center">{i + 1}</span>
                    <p className="font-semibold text-brand text-sm leading-tight truncate">
                      {group.name ?? fallbackName}
                    </p>
                  </div>
                  <div className="flex gap-4 text-center">
                    <p className={`text-sm font-bold w-10 ${vsPar !== null ? vsParColor : 'text-muted'}`}>
                      {vsPar !== null ? formatVsPar(vsPar) : '-'}
                    </p>
                    <p className="text-sm font-bold text-brand w-10">
                      {thruLabel(holesPlayed, score?.isLocked)}
                    </p>
                    <p className="text-sm font-bold text-brand w-10">
                      {total !== null ? total : '-'}
                    </p>
                  </div>
                </div>
              )
            })}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate(`/rounds/${roundId}/summary?from=scorecard&groupId=${groupId}`)}
                className="w-full py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold text-sm transition-colors"
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
