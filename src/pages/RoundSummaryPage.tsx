import { useParams, Link } from 'react-router-dom'
import { useRound } from '@/hooks/useRound'
import { useGroups } from '@/hooks/useGroup'
import { courseService } from '@/services/courseService'
import { scoreService } from '@/services/scoreService'
import { useEffect, useState } from 'react'
import type { Score, Tee, Group } from '@/types'
import { ScorecardGrid } from '@/components/scorecard/ScorecardGrid'
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
      <h1 className="text-2xl font-bold text-white">Signed Scorecard</h1>

      {scoringFormat === 'two_team'
        ? <TwoTeamLeaderboard round={round} groups={groups} allScores={allScores} tee={tee} useNet={useNet} />
        : <IndividualLeaderboard round={round} groups={groups} allScores={allScores} tee={tee} useNet={useNet} />
      }

      <ScorecardGrid scores={allScores} holes={tee.holes} isNet={useNet} />

      <Link
        to="/"
        className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Back to Tee Sheet
      </Link>
    </div>
  )
}

// ─── Individual leaderboard ────────────────────────────────────────────────

function IndividualLeaderboard({ round, groups, allScores, tee, useNet }: {
  round: import('@/types').Round
  groups: Group[]
  allScores: Score[]
  tee: Tee
  useNet: boolean
}) {
  const isBestBall = round.roundType === 'BEST_BALL_GROSS' || round.roundType === 'BEST_BALL_NET'

  if (isBestBall) {
    // Build team pairs from group-level teams, rank by best ball total
    const pairs: { names: string; total: number | null }[] = []
    for (const group of groups) {
      const teams = [
        { ids: group.teams?.teamA ?? [], label: 'A' },
        { ids: group.teams?.teamB ?? [], label: 'B' },
      ]
      for (const team of teams) {
        if (team.ids.length === 0) continue
        const names = team.ids
          .map((id) => allScores.find((s) => s.golferId === id)?.golferName ?? id)
          .join(' / ')
        const total = bestBallGroupScore(team.ids, allScores, tee.holes, useNet)
        pairs.push({ names, total })
      }
    }
    pairs.sort((a, b) => (a.total ?? 999) - (b.total ?? 999))
    const totalPar = tee.holes.reduce((s, h) => s + h.par, 0)

    return (
      <Card className="p-4">
        <h3 className="font-semibold text-gray-400 mb-3">Best Ball Leaderboard</h3>
        <div className="flex flex-col gap-2">
          {pairs.map((pair, i) => (
            <div key={pair.names} className={`flex items-center justify-between py-2 ${i === 0 ? 'font-bold text-green-400' : 'text-white'}`}>
              <span className="flex items-center gap-2">
                <span className="text-lg">{i === 0 ? '🏆' : `${i + 1}.`}</span>
                {pair.names}
              </span>
              <span className="font-mono text-right">
                {pair.total ?? '-'}
                {pair.total !== null && (
                  <span className="ml-2 text-sm text-gray-500">({formatVsPar(pair.total - totalPar)})</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  // Stroke play individual
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
            <div key={sc.golferId} className={`flex items-center justify-between py-2 ${i === 0 ? 'font-bold text-green-400' : 'text-white'}`}>
              <span className="flex items-center gap-2">
                <span className="text-lg">{i === 0 ? '🏆' : `${i + 1}.`}</span>
                {sc.golferName}
              </span>
              <span className="text-right">
                <span className="font-mono">{total ?? '-'}</span>
                <span className="ml-2 text-sm text-gray-500">({formatVsPar(vsPar)})</span>
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Two Team leaderboard ──────────────────────────────────────────────────

function TwoTeamLeaderboard({ round, groups, allScores, tee, useNet }: {
  round: import('@/types').Round
  groups: Group[]
  allScores: Score[]
  tee: Tee
  useNet: boolean
}) {
  const assignments = round.teamAssignments ?? {}
  const rt = round.roundType

  const isMatchPlay = rt === 'TWO_TEAM_BB_MATCH_GROSS' || rt === 'TWO_TEAM_BB_MATCH_NET'
  const isBestBallStroke = rt === 'TWO_TEAM_BB_STROKE_GROSS' || rt === 'TWO_TEAM_BB_STROKE_NET'
  const isStroke = rt === 'TWO_TEAM_STROKE_GROSS' || rt === 'TWO_TEAM_STROKE_NET'

  if (isMatchPlay) {
    // Per-group points, then overall team points
    let totalA = 0
    let totalB = 0
    const groupResults: { name: string; aPoints: number; bPoints: number }[] = []

    for (const group of groups) {
      const teamAIds = group.golferIds.filter((id) => assignments[id] === 'A')
      const teamBIds = group.golferIds.filter((id) => assignments[id] === 'B')
      const groupScores = allScores.filter((sc) => group.golferIds.includes(sc.golferId))
      const { aPoints, bPoints } = matchPlayPoints(teamAIds, teamBIds, groupScores, tee.holes, useNet)
      const aWins = aPoints > bPoints
      const bWins = bPoints > aPoints
      const roundA = aWins ? 1 : bWins ? 0 : 0.5
      const roundB = bWins ? 1 : aWins ? 0 : 0.5
      totalA += roundA
      totalB += roundB
      groupResults.push({ name: group.name ?? 'Group', aPoints, bPoints })
    }

    return (
      <Card className="p-4 flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-gray-400 mb-3">Overall Result</h3>
          <div className="flex gap-4">
            <TeamScoreTile label="Team A" points={totalA} winner={totalA > totalB} />
            <TeamScoreTile label="Team B" points={totalB} winner={totalB > totalA} />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-400 mb-2">Group Results</h3>
          <div className="flex flex-col gap-2">
            {groupResults.map((gr) => (
              <div key={gr.name} className="flex items-center justify-between text-sm text-white">
                <span>{gr.name}</span>
                <span className="font-mono">A: {gr.aPoints} — B: {gr.bPoints}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (isBestBallStroke) {
    const groupGolferIds = groups.map((g) => g.golferIds)
    const scoreA = twoTeamBestBallAggregateScore('A', assignments, groupGolferIds, allScores, tee.holes, useNet)
    const scoreB = twoTeamBestBallAggregateScore('B', assignments, groupGolferIds, allScores, tee.holes, useNet)
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-gray-400 mb-3">Team Best Ball Totals</h3>
        <div className="flex gap-4">
          <TeamScoreTile label="Team A" score={scoreA} winner={scoreA < scoreB} />
          <TeamScoreTile label="Team B" score={scoreB} winner={scoreB < scoreA} />
        </div>
      </Card>
    )
  }

  if (isStroke) {
    const scoreA = twoTeamAggregateScore('A', assignments, allScores, useNet)
    const scoreB = twoTeamAggregateScore('B', assignments, allScores, useNet)
    const countA = allScores.filter((s) => assignments[s.golferId] === 'A').length
    const countB = allScores.filter((s) => assignments[s.golferId] === 'B').length
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-gray-400 mb-3">Team Totals</h3>
        <div className="flex gap-4">
          <TeamScoreTile label="Team A" score={scoreA} avg={countA > 0 ? scoreA / countA : null} winner={scoreA < scoreB} />
          <TeamScoreTile label="Team B" score={scoreB} avg={countB > 0 ? scoreB / countB : null} winner={scoreB < scoreA} />
        </div>
      </Card>
    )
  }

  return null
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
