import { useNavigate } from 'react-router-dom'
import type { Score, Hole, Group } from '@/types'
import type { Match } from '@/types/round'
import {
  aggregateStrokeMatchStatus,
  formatVsPar,
  calculateTotalVsPar,
  calculateTotalNetVsPar,
  matchPlayPoints,
  bbMatchPlayHoleStatus,
  matchStatusLabel,
} from '@/lib/scoring'
import { usePanelState } from '@/hooks/usePanelState'

interface Props {
  match: Match
  groups: Group[]
  allScores: Score[]
  holes: Hole[]
  useNet: boolean
  roundId: string
  groupId: string
  currentUserId: string
}

// ---------------------------------------------------------------------------
// BB match play helpers
// ---------------------------------------------------------------------------

function statusColor(label: string): string {
  if (label === '-' || label === 'AS' || label === 'Tied (AS)') return 'text-muted'
  if (label.startsWith('Won') || label.endsWith('Up') || label === 'Dormie') return 'text-green-600'
  return 'text-danger'
}

function teamNames(teamIds: string[], scores: Score[], golferNames?: Record<string, string>): string {
  return teamIds
    .map((uid) => {
      const name = golferNames?.[uid] ?? scores.find((s) => s.golferId === uid)?.golferName ?? uid
      const parts = name.trim().split(/\s+/)
      return parts.length >= 2 ? parts[parts.length - 1] : name
    })
    .join(' / ')
}

// ---------------------------------------------------------------------------
// BB match play aggregate point tally across all groups
// ---------------------------------------------------------------------------

function bbAggregatePoints(
  groups: Group[],
  allScores: Score[],
  holes: Hole[],
  useNet: boolean,
): { totalA: number; totalB: number } {
  let totalA = 0
  let totalB = 0
  for (const group of groups) {
    const teamAIds = group.teams?.teamA ?? []
    const teamBIds = group.teams?.teamB ?? []
    if (teamAIds.length === 0 && teamBIds.length === 0) continue
    const groupScores = allScores.filter((s) => group.golferIds.includes(s.golferId))
    const { aUp, holesPlayed } = bbMatchPlayHoleStatus(teamAIds, teamBIds, groupScores, holes, useNet)
    const holesRemaining = holes.length - holesPlayed
    const matchOver = holesPlayed > 0 && (holesRemaining === 0 || Math.abs(aUp) > holesRemaining)
    if (!matchOver) continue
    if (aUp > 0) totalA += 1
    else if (aUp < 0) totalB += 1
    else { totalA += 0.5; totalB += 0.5 }
  }
  return { totalA, totalB }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchScoreSummary({ match, groups, allScores, holes, useNet, roundId, groupId }: Props) {
  const [open, toggle] = usePanelState('match-leaderboard')
  const navigate = useNavigate()

  const isBBMatch = match.teamFormat === 'AGGREGATE' && match.matchType === 'BEST_BALL'

  // Use round-level team arrays as authoritative source; fall back to group foursomes
  const teamAIds = (match.teamA && match.teamA.length > 0)
    ? match.teamA
    : groups.flatMap((g) => g.teams?.teamA ?? [])
  const teamBIds = (match.teamB && match.teamB.length > 0)
    ? match.teamB
    : groups.flatMap((g) => g.teams?.teamB ?? [])

  // Aggregate score display
  let scoreA: number, scoreB: number, leadingTeam: 'A' | 'B' | null
  if (isBBMatch) {
    const pts = bbAggregatePoints(groups, allScores, holes, useNet)
    scoreA = pts.totalA; scoreB = pts.totalB
  } else {
    const result = aggregateStrokeMatchStatus(teamAIds, teamBIds, allScores, useNet)
    scoreA = result.scoreA; scoreB = result.scoreB
  }
  leadingTeam = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : null

  // Only show players in this group
  const myGroup = groups.find((g) => g.groupId === groupId)
  const myGroupGolferIds = myGroup?.golferIds ?? []
  const groupScores = allScores.filter((s) => myGroupGolferIds.includes(s.golferId))

  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-brand">Match Leaderboard</span>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-card-border px-4 pt-3 pb-4 flex flex-col gap-3">

          {/* Team score tiles */}
          <div className="flex gap-3">
            <div className={`flex-1 rounded-xl p-3 text-center border-2 ${leadingTeam === 'A' ? 'border-brand bg-brand/20' : 'border-brand/30 bg-brand/20'}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-brand">Team A</p>
              <p className="text-3xl font-black text-brand">{scoreA > 0 ? scoreA : '—'}</p>
            </div>
            <div className={`flex-1 rounded-xl p-3 text-center border-2 ${leadingTeam === 'B' ? 'border-danger bg-danger/20' : 'border-danger/30 bg-danger/20'}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-danger">Team B</p>
              <p className="text-3xl font-black text-danger">{scoreB > 0 ? scoreB : '—'}</p>
            </div>
          </div>

          {isBBMatch ? (
            // BB match play: one row per foursome showing match status
            <>
              <p className="text-xs text-muted uppercase tracking-wide font-semibold">Matches</p>
              <div className="flex flex-col gap-2">
                {groups.map((group) => {
                  const gTeamA = group.teams?.teamA ?? []
                  const gTeamB = group.teams?.teamB ?? []
                  if (gTeamA.length === 0 && gTeamB.length === 0) return null
                  const gScores = allScores.filter((s) => group.golferIds.includes(s.golferId))
                  const { aUp, holesPlayed } = bbMatchPlayHoleStatus(gTeamA, gTeamB, gScores, holes, useNet)
                  const aLabel = matchStatusLabel(aUp, holesPlayed, holes.length)
                  const bLabel = matchStatusLabel(-aUp, holesPlayed, holes.length)
                  const namesA = teamNames(gTeamA, allScores, group.golferNames)
                  const namesB = teamNames(gTeamB, allScores, group.golferNames)
                  const isMyGroup = group.groupId === groupId
                  return (
                    <div
                      key={group.groupId}
                      className={`rounded-lg px-3 py-2.5 border ${isMyGroup ? 'border-brand/40 bg-brand/5' : 'border-card-border bg-card-bg'}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold w-16 shrink-0 ${statusColor(aLabel)}`}>{aLabel}</span>
                        <span className="text-xs text-center text-brand font-semibold flex-1 px-1 truncate">
                          {namesA} <span className="text-muted font-normal">vs</span> {namesB}
                        </span>
                        <span className={`text-xs font-bold w-16 shrink-0 text-right ${statusColor(bLabel)}`}>{bLabel}</span>
                      </div>
                      {holesPlayed > 0 && (
                        <p className="text-xs text-muted text-center mt-0.5">Thru {holesPlayed}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            // Standard aggregate: per-player rows in this group
            <>
              <p className="text-xs text-muted uppercase tracking-wide font-semibold">Group Scores</p>
              <div className="flex items-center justify-between px-3 -mt-1">
                <p className="text-xs text-muted uppercase tracking-wide flex-1 min-w-0">Player</p>
                <div className="flex gap-4 text-center shrink-0 ml-3">
                  <p className="text-xs text-muted uppercase tracking-wide w-10">Round</p>
                  <p className="text-xs text-muted uppercase tracking-wide w-10">Thru</p>
                  <p className="text-xs text-muted uppercase tracking-wide w-10">Total</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {[...groupScores].sort((a, b) => {
                  const aTotal = a.scores.length > 0 ? (useNet ? a.scores.reduce((s, h) => s + h.netScore, 0) : a.scores.reduce((s, h) => s + h.grossScore, 0)) : 999
                  const bTotal = b.scores.length > 0 ? (useNet ? b.scores.reduce((s, h) => s + h.netScore, 0) : b.scores.reduce((s, h) => s + h.grossScore, 0)) : 999
                  return aTotal - bTotal
                }).map((sc) => {
                  const isTeamA = teamAIds.includes(sc.golferId)
                  const holesPlayed = sc.scores.length
                  const total = holesPlayed > 0
                    ? (useNet ? sc.scores.reduce((s, h) => s + h.netScore, 0) : sc.scores.reduce((s, h) => s + h.grossScore, 0))
                    : null
                  const vsPar = useNet
                    ? calculateTotalNetVsPar(sc.scores, holes)
                    : calculateTotalVsPar(sc.scores, holes)
                  const thru = holesPlayed === 18 && sc.isLocked ? 'F' : holesPlayed > 0 ? `${holesPlayed}` : '-'
                  const vsParColor = holesPlayed > 0
                    ? (vsPar < 0 ? 'text-danger' : vsPar > 0 ? 'text-[#3A6280]' : 'text-brand')
                    : 'text-muted'
                  const rowClass = isTeamA ? 'bg-brand/20 border border-brand/30' : 'bg-danger/20 border border-danger/30'
                  const nameColor = isTeamA ? 'text-brand' : 'text-danger'
                  return (
                    <button
                      key={sc.golferId}
                      type="button"
                      onClick={() => navigate(`/rounds/${roundId}/scorecard/${sc.golferId}`)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg w-full text-left ${rowClass}`}
                    >
                      <span className={`text-sm font-semibold truncate flex-1 min-w-0 ${nameColor}`}>{sc.golferName}</span>
                      <div className="flex gap-4 text-center shrink-0 ml-3">
                        <p className={`text-sm font-bold w-10 ${holesPlayed > 0 ? vsParColor : 'text-muted'}`}>
                          {holesPlayed > 0 ? formatVsPar(vsPar) : '-'}
                        </p>
                        <p className="text-sm font-bold text-brand w-10">{thru}</p>
                        <p className="text-sm font-bold text-brand w-10">{total ?? '-'}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => navigate(`/rounds/${roundId}/summary?from=scorecard&groupId=${groupId}`)}
            className="w-full py-2 rounded-lg font-semibold text-sm transition-colors bg-brand hover:bg-brand-hover text-white"
          >
            Full Match Leaderboard
          </button>
        </div>
      )}
    </div>
  )
}
