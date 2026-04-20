import { useEffect, useState } from 'react'
import type React from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRound } from '@/hooks/useRound'
import { useGroups } from '@/hooks/useGroup'
import { courseService } from '@/services/courseService'
import { scoreService } from '@/services/scoreService'
import type { Score, Tee, Group } from '@/types'
import { Card, Spinner } from '@/components/ui'
import {
  formatVsPar,
  calculateTotalVsPar,
  calculateTotalNetVsPar,
  bestBallGroupScore,
  matchPlayPoints,
  twoTeamAggregateScore,
  twoTeamBestBallAggregateScore,
  buildLeaderboard,
  aggregateStrokeMatchStatus,
  bbMatchPlayHoleStatus,
  matchStatusLabel,
} from '@/lib/scoring'

export function RoundSummaryPage() {
  const { roundId } = useParams<{ roundId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  const groupId = searchParams.get('groupId')
  const { round, loading: roundLoading } = useRound(roundId!)
  const { groups, loading: groupsLoading } = useGroups(roundId!)
  const [allScores, setAllScores] = useState<Score[]>([])
  const [tee, setTee] = useState<Tee | null>(null)

  useEffect(() => {
    if (!round) return
    courseService.getCourse(round.courseId).then((c) => {
      const t = c?.tees.find((t) => t.teeId === round.teeId)
      if (t) setTee(t)
    })
  }, [round])

  useEffect(() => {
    if (groups.length === 0) return
    Promise.all(
      groups.map((g) => scoreService.getAllScores(roundId!, g.groupId))
    ).then((results) => {
      setAllScores(results.flat())
    })
  }, [groups, roundId])

  if (roundLoading || groupsLoading || !round || !tee) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  const useNet = round.roundType.includes('NET') || round.match?.scoring === 'NET'
  const scoringFormat = round.scoringFormat ?? 'individual'

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => {
          if (from === 'scorecard' && groupId) navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`)
          else navigate(`/rounds/${roundId}`)
        }}
        className="flex items-center justify-center w-full bg-brand hover:bg-brand-hover text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Back to Round
      </button>

      <h1 className="text-2xl font-bold text-brand">Leaderboard</h1>

      {round.match
        ? <MatchLeaderboard round={round} groups={groups} allScores={allScores} tee={tee} useNet={useNet} roundId={roundId!} navigate={navigate} />
        : scoringFormat === 'two_team'
        ? <TwoTeamLeaderboard round={round} groups={groups} allScores={allScores} tee={tee} useNet={useNet} roundId={roundId!} navigate={navigate} />
        : scoringFormat === 'scramble'
        ? <ScrambleLeaderboard groups={groups} allScores={allScores} tee={tee} roundId={roundId!} navigate={navigate} />
        : <IndividualLeaderboard round={round} groups={groups} allScores={allScores} tee={tee} useNet={useNet} roundId={roundId!} navigate={navigate} />
      }
    </div>
  )
}

// ─── Individual leaderboard ────────────────────────────────────────────────

function IndividualLeaderboard({ round, groups, allScores, tee, useNet, roundId, navigate, matchTeamIds }: {
  round: import('@/types').Round
  groups: Group[]
  allScores: Score[]
  tee: Tee
  useNet: boolean
  roundId: string
  navigate: ReturnType<typeof useNavigate>
  matchTeamIds?: { A: string[]; B: string[] }
}) {
  const isBestBall = round.roundType === 'BEST_BALL_GROSS' || round.roundType === 'BEST_BALL_NET'

  if (isBestBall) {
    const pairs: { names: string; leadId: string; total: number | null; vsPar: number | null }[] = []
    const totalPar = tee.holes.reduce((s, h) => s + h.par, 0)
    for (const group of groups) {
      for (const teamIds of [group.teams?.teamA ?? [], group.teams?.teamB ?? []]) {
        if (teamIds.length === 0) continue
        const members = allScores.filter((s) => teamIds.includes(s.golferId))
        const names = members.map((s) => s.golferName).join(' / ')
        const total = bestBallGroupScore(teamIds, allScores, tee.holes, useNet)
        const vsPar = total !== null ? total - totalPar : null
        pairs.push({ names, leadId: teamIds[0], total, vsPar })
      }
    }
    pairs.sort((a, b) => {
      if (a.total === null && b.total === null) return 0
      if (a.total === null) return 1
      if (b.total === null) return -1
      return a.total - b.total
    })

    return (
      <Card className="p-4">
        <h3 className="font-semibold text-muted mb-3">Best Ball Leaderboard</h3>
        <div className="flex flex-col gap-2">
          {pairs.map((pair, i) => (
            <button
              key={pair.leadId}
              type="button"
              onClick={() => navigate(`/rounds/${roundId}/scorecard/${pair.leadId}`)}
              className="flex items-center justify-between px-3 py-3 rounded-lg bg-card-bg hover:bg-card-bg transition-colors w-full text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-lg w-7 shrink-0 font-bold text-brand">{i + 1}.</span>
                <span className="text-brand truncate">{pair.names}</span>
              </span>
              <span className="flex items-center gap-0 shrink-0 ml-3">
                <span className="font-mono w-8 text-right text-brand">{pair.total ?? '-'}</span>
                <span className="font-mono w-14 text-right text-sm text-muted">{pair.vsPar !== null ? `(${formatVsPar(pair.vsPar)})` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>
    )
  }

  // Stroke play
  const leaderboard = buildLeaderboard(allScores, tee.holes, useNet)

  return (
    <Card className="p-4">
      {/* Column headers */}
      <div className="flex items-center justify-between px-3 mb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <p className="text-xs text-muted uppercase tracking-wide w-7 shrink-0 text-center">Pos</p>
          <p className="text-xs text-muted uppercase tracking-wide">Player</p>
        </div>
        <div className="flex gap-4 text-center shrink-0 ml-3">
          <p className="text-xs text-muted uppercase tracking-wide w-10">Round</p>
          <p className="text-xs text-muted uppercase tracking-wide w-10">Thru</p>
          <p className="text-xs text-muted uppercase tracking-wide w-16 text-right">Total</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {leaderboard.map(({ score: sc, vsPar, holesPlayed, rankLabel }) => {
          const gross = sc.scores.reduce((s, h) => s + h.grossScore, 0)
          const net = sc.scores.reduce((s, h) => s + h.netScore, 0)
          const displayScore = holesPlayed > 0 ? (useNet ? net : gross) : null
          const displayGross = holesPlayed > 0 ? gross : null
          const isTeamA = matchTeamIds?.A.includes(sc.golferId)
          const isTeamB = matchTeamIds?.B.includes(sc.golferId)
          const rowClass = isTeamA
            ? 'bg-brand/20 border border-brand/30'
            : isTeamB
            ? 'bg-danger/20 border border-danger/30'
            : 'bg-card-bg'
          const nameColor = isTeamA ? 'text-brand' : isTeamB ? 'text-danger' : 'text-brand'
          return (
            <button
              key={sc.golferId}
              type="button"
              onClick={() => navigate(`/rounds/${roundId}/scorecard/${sc.golferId}`)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors w-full text-left ${rowClass}`}
            >
              <span className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs w-7 shrink-0 font-bold text-muted text-center">{rankLabel}</span>
                <span className={`truncate text-sm font-semibold ${nameColor}`}>{sc.golferName}</span>
              </span>
              <ScoreStatus holesPlayed={holesPlayed} isLocked={sc.isLocked} score={displayScore} vsPar={vsPar ?? 0} grossScore={useNet ? displayGross : null} />
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Scramble leaderboard ─────────────────────────────────────────────────

function ScrambleLeaderboard({ groups, allScores, tee, roundId, navigate }: {
  groups: Group[]
  allScores: Score[]
  tee: Tee
  roundId: string
  navigate: ReturnType<typeof useNavigate>
}) {
  const rows = groups.map((group) => {
    const adminId = group.groupAdminId ?? group.golferIds[0]
    const score = allScores.find((s) => s.golferId === adminId)
    const holesPlayed = score?.scores.length ?? 0
    const total = holesPlayed > 0
      ? score!.scores.reduce((s, h) => s + h.grossScore, 0)
      : null
    const parPlayed = holesPlayed > 0
      ? score!.scores.reduce((s, h) => {
          const hole = tee.holes.find((hd) => hd.number === h.hole)
          return s + (hole?.par ?? 0)
        }, 0)
      : null
    const vsPar = total !== null && parPlayed !== null ? total - parPlayed : null
    return { group, adminId, score, holesPlayed, total, vsPar }
  }).sort((a, b) => {
    if (a.vsPar === null && b.vsPar === null) return b.holesPlayed - a.holesPlayed
    if (a.vsPar === null) return 1
    if (b.vsPar === null) return -1
    if (a.vsPar !== b.vsPar) return a.vsPar - b.vsPar
    return b.holesPlayed - a.holesPlayed
  })

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-muted mb-3">Scramble Leaderboard</h3>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => {
          const adminScore = allScores.find((s) => s.golferId === row.adminId)
          const holesPlayed = adminScore?.scores.length ?? 0
          const isLocked = adminScore?.isLocked ?? false
          return (
          <button
            key={row.group.groupId}
            type="button"
            onClick={() => navigate(`/rounds/${roundId}/scorecard/${row.adminId}`)}
            className="flex items-center justify-between px-3 py-3 rounded-lg bg-card-bg hover:bg-card-bg transition-colors w-full text-left"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-lg w-7 shrink-0 font-bold text-brand">{i + 1}.</span>
              <span className="text-brand truncate">{row.group.name ?? `Group ${i + 1}`}</span>
            </span>
            <ScoreStatus holesPlayed={holesPlayed} isLocked={isLocked} score={row.total} vsPar={row.vsPar ?? 0} />
          </button>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Two Team leaderboard ──────────────────────────────────────────────────

function TwoTeamLeaderboard({ round, groups, allScores, tee, useNet, roundId, navigate }: {
  round: import('@/types').Round
  groups: Group[]
  allScores: Score[]
  tee: Tee
  useNet: boolean
  roundId: string
  navigate: ReturnType<typeof useNavigate>
}) {
  const assignments = round.teamAssignments ?? {}
  const rt = round.roundType

  const isMatchPlay = rt === 'TWO_TEAM_BB_MATCH_GROSS' || rt === 'TWO_TEAM_BB_MATCH_NET'
  const isBestBallStroke = rt === 'TWO_TEAM_BB_STROKE_GROSS' || rt === 'TWO_TEAM_BB_STROKE_NET'
  const isStroke = rt === 'TWO_TEAM_STROKE_GROSS' || rt === 'TWO_TEAM_STROKE_NET'

  const teamAScores = allScores.filter((s) => assignments[s.golferId] === 'A')
  const teamBScores = allScores.filter((s) => assignments[s.golferId] === 'B')

  let teamSection: React.ReactNode = null

  if (isMatchPlay) {
    let totalA = 0, totalB = 0
    const groupResults: { name: string; aPoints: number; bPoints: number }[] = []
    for (const group of groups) {
      const teamAIds = group.golferIds.filter((id) => assignments[id] === 'A')
      const teamBIds = group.golferIds.filter((id) => assignments[id] === 'B')
      const groupScores = allScores.filter((sc) => group.golferIds.includes(sc.golferId))
      const { aPoints, bPoints } = matchPlayPoints(teamAIds, teamBIds, groupScores, tee.holes, useNet)
      const aWins = aPoints > bPoints, bWins = bPoints > aPoints
      totalA += aWins ? 1 : bWins ? 0 : 0.5
      totalB += bWins ? 1 : aWins ? 0 : 0.5
      groupResults.push({ name: group.name ?? 'Group', aPoints, bPoints })
    }
    teamSection = (
      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
          <TeamScoreTile label="Team A" points={totalA} winner={totalA > totalB} />
          <TeamScoreTile label="Team B" points={totalB} winner={totalB > totalA} />
        </div>
        <div className="flex flex-col gap-1">
          {groupResults.map((gr) => (
            <div key={gr.name} className="flex items-center justify-between text-sm text-muted px-1">
              <span>{gr.name}</span>
              <span className="font-mono">A: {gr.aPoints} — B: {gr.bPoints}</span>
            </div>
          ))}
        </div>
      </div>
    )
  } else if (isBestBallStroke) {
    const groupGolferIds = groups.map((g) => g.golferIds)
    const scoreA = twoTeamBestBallAggregateScore('A', assignments, groupGolferIds, allScores, tee.holes, useNet)
    const scoreB = twoTeamBestBallAggregateScore('B', assignments, groupGolferIds, allScores, tee.holes, useNet)
    teamSection = (
      <div className="flex gap-4">
        <TeamScoreTile label="Team A" score={scoreA} winner={scoreA < scoreB} />
        <TeamScoreTile label="Team B" score={scoreB} winner={scoreB < scoreA} />
      </div>
    )
  } else if (isStroke) {
    const scoreA = twoTeamAggregateScore('A', assignments, allScores, useNet)
    const scoreB = twoTeamAggregateScore('B', assignments, allScores, useNet)
    const countA = teamAScores.length, countB = teamBScores.length
    teamSection = (
      <div className="flex gap-4">
        <TeamScoreTile label="Team A" score={scoreA} avg={countA > 0 ? scoreA / countA : null} winner={scoreA < scoreB} />
        <TeamScoreTile label="Team B" score={scoreB} avg={countB > 0 ? scoreB / countB : null} winner={scoreB < scoreA} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex flex-col gap-4">
        {teamSection}
      </Card>

      {/* Per-team player lists */}
      {[{ label: 'Team A', scores: teamAScores }, { label: 'Team B', scores: teamBScores }].map(({ label, scores }) => (
        <Card key={label} className="p-4">
          <h3 className="font-semibold text-muted mb-3">{label}</h3>
          <div className="flex flex-col gap-2">
            {scores
              .sort((a, b) => {
                const aScore = (useNet ? a.totalNet : a.totalGross) ?? null
                const bScore = (useNet ? b.totalNet : b.totalGross) ?? null
                if (aScore === null && bScore === null) return b.scores.length - a.scores.length
                if (aScore === null) return 1
                if (bScore === null) return -1
                if (aScore !== bScore) return aScore - bScore
                return b.scores.length - a.scores.length
              })
              .map((sc, i) => {
                return (
                  <button
                    key={sc.golferId}
                    type="button"
                    onClick={() => navigate(`/rounds/${roundId}/scorecard/${sc.golferId}`)}
                    className="flex items-center justify-between px-3 py-3 rounded-lg bg-card-bg hover:bg-card-bg transition-colors w-full text-left"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-brand w-5 shrink-0">{i + 1}.</span>
                      <span className="text-brand truncate">{sc.golferName}</span>
                    </span>
                    <ScoreStatus
                      holesPlayed={sc.scores.length}
                      isLocked={sc.isLocked}
                      score={sc.scores.length > 0 ? (useNet ? sc.scores.reduce((s, h) => s + h.netScore, 0) : sc.scores.reduce((s, h) => s + h.grossScore, 0)) : null}
                      vsPar={useNet ? calculateTotalNetVsPar(sc.scores, tee.holes) : calculateTotalVsPar(sc.scores, tee.holes)}
                    />
                  </button>
                )
              })}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ─── Match leaderboard ─────────────────────────────────────────────────────

function statusColor(label: string): string {
  if (label === '-' || label === 'AS' || label === 'Tied (AS)') return 'text-muted'
  if (label.startsWith('Won') || label.endsWith('Up') || label === 'Dormie') return 'text-green-600'
  return 'text-danger'
}

function lastNames(teamIds: string[], allScores: Score[], golferNames?: Record<string, string>): string {
  return teamIds.map((uid) => {
    const name = golferNames?.[uid] ?? allScores.find((s) => s.golferId === uid)?.golferName ?? uid
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2 ? parts[parts.length - 1] : name
  }).join(' / ')
}

function MatchLeaderboard({ round, groups, allScores, tee, useNet, roundId, navigate }: {
  round: import('@/types').Round
  groups: Group[]
  allScores: Score[]
  tee: Tee
  useNet: boolean
  roundId: string
  navigate: ReturnType<typeof useNavigate>
}) {
  const match = round.match!
  const isBBMatch = match.teamFormat === 'AGGREGATE' && match.matchType === 'BEST_BALL'

  // Use round-level team arrays as authoritative source; fall back to group foursomes
  const teamAIds = (match.teamA && match.teamA.length > 0)
    ? match.teamA
    : groups.flatMap((g) => g.teams?.teamA ?? [])
  const teamBIds = (match.teamB && match.teamB.length > 0)
    ? match.teamB
    : groups.flatMap((g) => g.teams?.teamB ?? [])

  if (isBBMatch) {
    // Aggregate BB match play: per-group match rows
    let totalA = 0, totalB = 0
    const matchRows = groups.map((group) => {
      const gTeamA = group.teams?.teamA ?? []
      const gTeamB = group.teams?.teamB ?? []
      const gScores = allScores.filter((s) => group.golferIds.includes(s.golferId))
      const { aUp, holesPlayed } = bbMatchPlayHoleStatus(gTeamA, gTeamB, gScores, tee.holes, useNet)
      const holesRemaining = tee.holes.length - holesPlayed
      const matchOver = holesPlayed > 0 && (holesRemaining === 0 || Math.abs(aUp) > holesRemaining)
      if (matchOver) {
        if (aUp > 0) totalA += 1
        else if (aUp < 0) totalB += 1
        else { totalA += 0.5; totalB += 0.5 }
      }
      const aLabel = matchStatusLabel(aUp, holesPlayed, tee.holes.length)
      const bLabel = matchStatusLabel(-aUp, holesPlayed, tee.holes.length)
      return { group, gTeamA, gTeamB, gScores, aLabel, bLabel, holesPlayed }
    })
    const leadingTeam = totalA > totalB ? 'A' : totalB > totalA ? 'B' : null

    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className={`flex-1 rounded-xl p-3 text-center border-2 ${leadingTeam === 'A' ? 'border-brand bg-brand/20' : 'border-brand/30 bg-brand/20'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-brand">Team A</p>
            <p className="text-3xl font-black text-brand">{totalA > 0 ? totalA : '—'}</p>
          </div>
          <div className={`flex-1 rounded-xl p-3 text-center border-2 ${leadingTeam === 'B' ? 'border-danger bg-danger/20' : 'border-danger/30 bg-danger/20'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-danger">Team B</p>
            <p className="text-3xl font-black text-danger">{totalB > 0 ? totalB : '—'}</p>
          </div>
        </div>

        <Card className="p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-muted">Matches</h3>
          {matchRows.map(({ group, gTeamA, gTeamB, gScores, aLabel, bLabel, holesPlayed }) => {
            const namesA = lastNames(gTeamA, allScores, group.golferNames)
            const namesB = lastNames(gTeamB, allScores, group.golferNames)
            return (
              <div key={group.groupId} className="rounded-lg border border-card-border bg-card-bg px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-bold w-20 shrink-0 ${statusColor(aLabel)}`}>{aLabel}</span>
                  <div className="flex-1 text-center min-w-0 px-1">
                    <p className="text-sm font-semibold text-brand truncate">
                      {namesA} <span className="text-muted font-normal text-xs">vs</span> {namesB}
                    </p>
                  </div>
                  <span className={`text-sm font-bold w-20 shrink-0 text-right ${statusColor(bLabel)}`}>{bLabel}</span>
                </div>
                {holesPlayed > 0 && (
                  <p className="text-xs text-muted text-center mt-1">
                    {holesPlayed === tee.holes.length ? 'Final' : `Thru ${holesPlayed}`}
                  </p>
                )}
              </div>
            )
          })}
        </Card>
      </div>
    )
  }

  // Standard aggregate stroke match
  const { scoreA, scoreB } = aggregateStrokeMatchStatus(teamAIds, teamBIds, allScores, useNet)
  const leadingTeam = scoreA < scoreB ? 'A' : scoreB < scoreA ? 'B' : null

  return (
    <div className="flex flex-col gap-4">
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

      {/* Individual leaderboard with team color coding */}
      <IndividualLeaderboard
        round={round}
        groups={groups}
        allScores={allScores}
        tee={tee}
        useNet={useNet}
        roundId={roundId}
        navigate={navigate}
        matchTeamIds={{ A: teamAIds, B: teamBIds }}
      />
    </div>
  )
}

function TeamScoreTile({ label, score, avg, points, winner }: {
  label: string
  score?: number
  avg?: number | null
  points?: number
  winner: boolean
}) {
  return (
    <div className={`flex-1 rounded-xl p-4 border-2 ${winner ? 'border-brand bg-brand/10' : 'border-card-border bg-card-bg'}`}>
      <div className={`text-sm font-semibold mb-1 ${winner ? 'text-brand' : 'text-muted'}`}>
        {label} {winner ? '🏆' : ''}
      </div>
      {points !== undefined && (
        <div className="text-2xl font-bold text-brand">{points} pts</div>
      )}
      {score !== undefined && (
        <>
          <div className="text-2xl font-bold text-brand">{score}</div>
          {avg !== null && avg !== undefined && (
            <div className="text-xs text-muted">avg {avg.toFixed(1)}</div>
          )}
        </>
      )}
    </div>
  )
}

function ScoreStatus({ holesPlayed, isLocked, score, vsPar, grossScore }: {
  holesPlayed: number
  isLocked: boolean
  score: number | null
  vsPar: number
  grossScore?: number | null
}) {
  const thru = (holesPlayed === 18 && isLocked) ? 'F' : holesPlayed > 0 ? `${holesPlayed}` : '-'
  const vsParColor = vsPar < 0 ? 'text-danger' : vsPar > 0 ? 'text-[#3A6280]' : 'text-brand'
  const scoreDisplay = score !== null && score !== undefined
    ? (grossScore !== null && grossScore !== undefined && grossScore !== score
      ? `${score} (${grossScore})`
      : `${score}`)
    : '-'
  return (
    <div className="flex gap-4 text-center shrink-0 ml-3">
      <p className={`text-sm font-bold w-10 ${holesPlayed > 0 ? vsParColor : 'text-muted'}`}>
        {holesPlayed > 0 ? formatVsPar(vsPar) : '-'}
      </p>
      <p className="text-sm font-bold text-brand w-10">{thru}</p>
      <p className="text-sm font-bold text-brand w-16 text-right">{scoreDisplay}</p>
    </div>
  )
}
