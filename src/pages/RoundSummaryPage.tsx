import { useEffect, useState } from 'react'
import type React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
} from '@/lib/scoring'

export function RoundSummaryPage() {
  const { roundId } = useParams<{ roundId: string }>()
  const navigate = useNavigate()
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

  const useNet = round.roundType.includes('NET')
  const scoringFormat = round.scoringFormat ?? 'individual'

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Leaderboard</h1>

      {scoringFormat === 'two_team'
        ? <TwoTeamLeaderboard round={round} groups={groups} allScores={allScores} tee={tee} useNet={useNet} roundId={roundId!} navigate={navigate} />
        : scoringFormat === 'scramble'
        ? <ScrambleLeaderboard groups={groups} allScores={allScores} tee={tee} roundId={roundId!} navigate={navigate} />
        : <IndividualLeaderboard round={round} groups={groups} allScores={allScores} tee={tee} useNet={useNet} roundId={roundId!} navigate={navigate} />
      }

      <Link
        to={`/rounds/${roundId}`}
        className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Back to Round
      </Link>
    </div>
  )
}

// ─── Individual leaderboard ────────────────────────────────────────────────

function IndividualLeaderboard({ round, groups, allScores, tee, useNet, roundId, navigate }: {
  round: import('@/types').Round
  groups: Group[]
  allScores: Score[]
  tee: Tee
  useNet: boolean
  roundId: string
  navigate: ReturnType<typeof useNavigate>
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
    pairs.sort((a, b) => (a.total ?? 999) - (b.total ?? 999))

    return (
      <Card className="p-4">
        <h3 className="font-semibold text-gray-400 mb-3">Best Ball Leaderboard</h3>
        <div className="flex flex-col gap-2">
          {pairs.map((pair, i) => (
            <button
              key={pair.leadId}
              type="button"
              onClick={() => navigate(`/rounds/${roundId}/scorecard/${pair.leadId}`)}
              className="flex items-center justify-between px-3 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors w-full text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-lg w-7 shrink-0 font-bold text-white">{i === 0 ? '🏆' : `${i + 1}.`}</span>
                <span className={`truncate ${i === 0 ? 'font-bold text-green-400' : 'text-white'}`}>{pair.names}</span>
              </span>
              <span className="flex items-center gap-0 shrink-0 ml-3">
                <span className="font-mono w-8 text-right text-white">{pair.total ?? '-'}</span>
                <span className="font-mono w-14 text-right text-sm text-gray-400">{pair.vsPar !== null ? `(${formatVsPar(pair.vsPar)})` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>
    )
  }

  // Stroke play
  const leaderboard = [...allScores].sort((a, b) => {
    const aScore = useNet ? (a.totalNet ?? 999) : (a.totalGross ?? 999)
    const bScore = useNet ? (b.totalNet ?? 999) : (b.totalGross ?? 999)
    return aScore - bScore
  })

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-400 mb-3">Leaderboard</h3>
      <div className="flex flex-col gap-2">
        {leaderboard.map((sc, i) => {
          const total = useNet ? sc.totalNet : sc.totalGross
          const vsPar = useNet
            ? calculateTotalNetVsPar(sc.scores, tee.holes)
            : calculateTotalVsPar(sc.scores, tee.holes)
          return (
            <button
              key={sc.golferId}
              type="button"
              onClick={() => navigate(`/rounds/${roundId}/scorecard/${sc.golferId}`)}
              className="flex items-center justify-between px-3 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors w-full text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-lg w-7 shrink-0 font-bold text-white">{i === 0 ? '🏆' : `${i + 1}.`}</span>
                <span className={`truncate ${i === 0 ? 'font-bold text-green-400' : 'text-white'}`}>{sc.golferName}</span>
              </span>
              <span className="flex items-center shrink-0 ml-3">
                <span className="font-mono w-8 text-right text-white">{total ?? '-'}</span>
                <span className="font-mono w-14 text-right text-sm text-gray-400">({formatVsPar(vsPar)})</span>
              </span>
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
  const totalPar = tee.holes.reduce((s, h) => s + h.par, 0)

  const rows = groups.map((group) => {
    const adminId = group.groupAdminId ?? group.golferIds[0]
    const score = allScores.find((s) => s.golferId === adminId)
    const total = score?.totalGross ?? null
    const vsPar = total !== null ? total - totalPar : null
    return { group, adminId, total, vsPar }
  }).sort((a, b) => (a.total ?? 999) - (b.total ?? 999))

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-400 mb-3">Scramble Leaderboard</h3>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <button
            key={row.group.groupId}
            type="button"
            onClick={() => navigate(`/rounds/${roundId}/scorecard/${row.adminId}`)}
            className="flex items-center justify-between px-3 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors w-full text-left"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-lg w-7 shrink-0 font-bold text-white">{i === 0 ? '🏆' : `${i + 1}.`}</span>
              <span className={`truncate ${i === 0 ? 'font-bold text-green-400' : 'text-white'}`}>{row.group.name ?? `Group ${i + 1}`}</span>
            </span>
            <span className="flex items-center shrink-0 ml-3">
              <span className="font-mono w-8 text-right text-white">{row.total ?? '-'}</span>
              <span className="font-mono w-14 text-right text-sm text-gray-400">{row.vsPar !== null ? `(${formatVsPar(row.vsPar)})` : ''}</span>
            </span>
          </button>
        ))}
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
            <div key={gr.name} className="flex items-center justify-between text-sm text-gray-400 px-1">
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
          <h3 className="font-semibold text-gray-400 mb-3">{label}</h3>
          <div className="flex flex-col gap-2">
            {scores
              .sort((a, b) => ((useNet ? a.totalNet : a.totalGross) ?? 999) - ((useNet ? b.totalNet : b.totalGross) ?? 999))
              .map((sc, i) => {
                const total = useNet ? sc.totalNet : sc.totalGross
                const vsPar = useNet
                  ? calculateTotalNetVsPar(sc.scores, tee.holes)
                  : calculateTotalVsPar(sc.scores, tee.holes)
                return (
                  <button
                    key={sc.golferId}
                    type="button"
                    onClick={() => navigate(`/rounds/${roundId}/scorecard/${sc.golferId}`)}
                    className="flex items-center justify-between px-3 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors w-full text-left"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-white w-5 shrink-0">{i + 1}.</span>
                      <span className="text-white truncate">{sc.golferName}</span>
                    </span>
                    <span className="flex items-center shrink-0 ml-3">
                      <span className="font-mono w-8 text-right text-white">{total ?? '-'}</span>
                      <span className="font-mono w-14 text-right text-sm text-gray-400">({formatVsPar(vsPar)})</span>
                    </span>
                  </button>
                )
              })}
          </div>
        </Card>
      ))}
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
    <div className={`flex-1 rounded-xl p-4 border-2 ${winner ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700/50'}`}>
      <div className={`text-sm font-semibold mb-1 ${winner ? 'text-green-400' : 'text-gray-400'}`}>
        {label} {winner ? '🏆' : ''}
      </div>
      {points !== undefined && (
        <div className="text-2xl font-bold text-white">{points} pts</div>
      )}
      {score !== undefined && (
        <>
          <div className="text-2xl font-bold text-white">{score}</div>
          {avg !== null && avg !== undefined && (
            <div className="text-xs text-gray-500">avg {avg.toFixed(1)}</div>
          )}
        </>
      )}
    </div>
  )
}
