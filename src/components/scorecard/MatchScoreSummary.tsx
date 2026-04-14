import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Score, Hole, Group } from '@/types'
import type { Match } from '@/types/round'
import { aggregateStrokeMatchStatus, formatVsPar, calculateTotalVsPar, calculateTotalNetVsPar } from '@/lib/scoring'

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

export function MatchScoreSummary({ match, groups, allScores, holes, useNet, roundId, groupId }: Props) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // Use round-level team arrays as authoritative source; fall back to group foursomes
  const teamAIds = (match.teamA && match.teamA.length > 0)
    ? match.teamA
    : groups.flatMap((g) => g.teams?.teamA ?? [])
  const teamBIds = (match.teamB && match.teamB.length > 0)
    ? match.teamB
    : groups.flatMap((g) => g.teams?.teamB ?? [])

  // Full-round aggregate totals
  const { scoreA, scoreB } = aggregateStrokeMatchStatus(teamAIds, teamBIds, allScores, useNet)
  const leadingTeam = scoreA < scoreB ? 'A' : scoreB < scoreA ? 'B' : null

  // Only show players in this group
  const myGroup = groups.find((g) => g.groupId === groupId)
  const myGroupGolferIds = myGroup?.golferIds ?? []
  const groupScores = allScores.filter((s) => myGroupGolferIds.includes(s.golferId))
  const sorted = [...groupScores].sort((a, b) => {
    const aTotal = a.scores.length > 0 ? (useNet ? a.scores.reduce((s, h) => s + h.netScore, 0) : a.scores.reduce((s, h) => s + h.grossScore, 0)) : 999
    const bTotal = b.scores.length > 0 ? (useNet ? b.scores.reduce((s, h) => s + h.netScore, 0) : b.scores.reduce((s, h) => s + h.grossScore, 0)) : 999
    return aTotal - bTotal
  })

  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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

          {/* Team score tiles — full round aggregates */}
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

          {/* Group Scores section */}
          <p className="text-xs text-muted uppercase tracking-wide font-semibold">Group Scores</p>

          {/* Column headers */}
          <div className="flex items-center justify-between px-3 -mt-1">
            <p className="text-xs text-muted uppercase tracking-wide flex-1 min-w-0">Player</p>
            <div className="flex gap-4 text-center shrink-0 ml-3">
              <p className="text-xs text-muted uppercase tracking-wide w-10">Round</p>
              <p className="text-xs text-muted uppercase tracking-wide w-10">Thru</p>
              <p className="text-xs text-muted uppercase tracking-wide w-10">Total</p>
            </div>
          </div>

          {/* Player rows — this group only */}
          <div className="flex flex-col gap-1.5">
            {sorted.map((sc) => {
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

          {/* Full Match Leaderboard button */}
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
