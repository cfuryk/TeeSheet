import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMyBets } from '@/hooks/useMyBets'
import { roundService } from '@/services/roundService'
import { scoreService } from '@/services/scoreService'
import { Spinner } from '@/components/ui'
import { BET_TYPE_LABELS } from '@/pages/SideBetsPage'
import type { Round, SideBet, Score } from '@/types'

// ─── Payout helpers ────────────────────────────────────────────────────────────

function calcSideBetNet(bet: SideBet, uid: string): number | null {
  if (bet.status !== 'settled') return null
  const winners = bet.winnersIds ?? []
  if (winners.length === 0) return 0 // full tie — pot returned
  const pot = bet.participantIds.length * bet.wagerPerPerson
  if (winners.includes(uid)) return pot / winners.length - bet.wagerPerPerson
  return -bet.wagerPerPerson
}

/** Determine if uid won the round, and how many winners there are.
 *  Returns null if outcome can't be determined. */
function calcRoundWagerNet(
  round: Round,
  allScores: Score[],
  uid: string,
): number | null {
  if (!round.wager || round.wager <= 0) return null
  const numParticipants = round.memberIds?.length ?? 0
  if (numParticipants < 2) return null
  const pot = numParticipants * round.wager
  const rt = round.roundType
  const useNet = rt.includes('NET')

  if (rt === 'STROKE_GROSS' || rt === 'STROKE_NET') {
    const withScores = allScores.filter((s) => (useNet ? s.totalNet : s.totalGross) !== null)
    if (withScores.length < 2) return null
    const minScore = Math.min(...withScores.map((s) => (useNet ? s.totalNet! : s.totalGross!)))
    const winners = withScores.filter((s) => (useNet ? s.totalNet : s.totalGross) === minScore)
    const numWinners = winners.length
    const isWinner = winners.some((s) => s.golferId === uid)
    if (isWinner) return pot / numWinners - round.wager
    return -round.wager
  }

  if (rt === 'BEST_BALL_GROSS' || rt === 'BEST_BALL_NET') {
    // approximate: just use totalGross/Net per player, same as RoundDetailPage
    const withScores = allScores.filter((s) => (useNet ? s.totalNet : s.totalGross) !== null)
    if (withScores.length < 2) return null
    const minScore = Math.min(...withScores.map((s) => (useNet ? s.totalNet! : s.totalGross!)))
    const winners = withScores.filter((s) => (useNet ? s.totalNet : s.totalGross) === minScore)
    const numWinners = winners.length
    const isWinner = winners.some((s) => s.golferId === uid)
    if (isWinner) return pot / numWinners - round.wager
    return -round.wager
  }

  // Two-team: determine winner by team assignment
  if (rt.startsWith('TWO_TEAM')) {
    const assignments = round.teamAssignments ?? {}
    const userTeam = assignments[uid]
    if (!userTeam) return null

    const teamAIds = (round.memberIds ?? []).filter((id) => assignments[id] === 'A')
    const teamBIds = (round.memberIds ?? []).filter((id) => assignments[id] === 'B')
    if (teamAIds.length === 0 || teamBIds.length === 0) return null

    let scoreA: number, scoreB: number
    if (rt === 'TWO_TEAM_BB_MATCH_GROSS' || rt === 'TWO_TEAM_BB_MATCH_NET') {
      // rough approximation for match play: sum of individual totals per team
      const sumA = allScores.filter((s) => assignments[s.golferId] === 'A').reduce((acc, s) => acc + ((useNet ? s.totalNet : s.totalGross) ?? 0), 0)
      const sumB = allScores.filter((s) => assignments[s.golferId] === 'B').reduce((acc, s) => acc + ((useNet ? s.totalNet : s.totalGross) ?? 0), 0)
      scoreA = sumA; scoreB = sumB
    } else {
      scoreA = allScores.filter((s) => assignments[s.golferId] === 'A').reduce((acc, s) => acc + ((useNet ? s.totalNet : s.totalGross) ?? 0), 0)
      scoreB = allScores.filter((s) => assignments[s.golferId] === 'B').reduce((acc, s) => acc + ((useNet ? s.totalNet : s.totalGross) ?? 0), 0)
    }

    const numWinnersTeam = teamAIds.length + teamBIds.length
    const winningTeam = scoreA < scoreB ? 'A' : scoreB < scoreA ? 'B' : null

    if (winningTeam === null) return 0 // tie
    const winningTeamSize = winningTeam === 'A' ? teamAIds.length : teamBIds.length
    const losingTeamSize = winningTeam === 'A' ? teamBIds.length : teamAIds.length
    const winnerPot = losingTeamSize * round.wager
    void numWinnersTeam
    if (userTeam === winningTeam) return winnerPot / winningTeamSize - round.wager
    return -round.wager
  }

  return null
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function MyBetsPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const uid = currentUser!.uid
  const { bets, loading: betsLoading } = useMyBets(uid)

  // Round wager state
  const [wagerRounds, setWagerRounds] = useState<Round[]>([])
  const [roundsLoading, setRoundsLoading] = useState(true)
  const [roundScores, setRoundScores] = useState<Record<string, Score[]>>({})
  const [roundsMap, setRoundsMap] = useState<Record<string, Round>>({})

  // Subscribe to member rounds, keep only completed + wager
  useEffect(() => {
    const unsub = roundService.onRoundsByMemberSnapshot(uid, (rounds) => {
      const wagered = rounds.filter((r) => r.status === 'completed' && r.wager && r.wager > 0)
      setWagerRounds(wagered)
      setRoundsLoading(false)
    })
    return unsub
  }, [uid])

  // Fetch scores for each wager round
  useEffect(() => {
    if (wagerRounds.length === 0) return
    Promise.all(
      wagerRounds.map(async (round) => {
        const allGroupScores = await Promise.all(
          round.groupIds.map((gid) => scoreService.getAllScores(round.roundId, gid))
        )
        return { roundId: round.roundId, scores: allGroupScores.flat() }
      })
    ).then((results) => {
      const map: Record<string, Score[]> = {}
      for (const { roundId, scores } of results) map[roundId] = scores
      setRoundScores(map)
    })
  }, [wagerRounds])

  // Build rounds map for side bet course/date lookups
  useEffect(() => {
    if (bets.length === 0) return
    const uniqueRoundIds = [...new Set(bets.map((b) => b.roundId))]
    Promise.all(uniqueRoundIds.map((id) => roundService.getRound(id))).then((rounds) => {
      const map: Record<string, Round> = {}
      for (const r of rounds) {
        if (r) map[r.roundId] = r
      }
      setRoundsMap(map)
    })
  }, [bets])

  // ─── Aggregates ─────────────────────────────────────────────────────────────

  const sideBetAggregate = bets
    .filter((b) => b.status === 'settled')
    .reduce((sum, b) => {
      const net = calcSideBetNet(b, uid)
      return net !== null ? sum + net : sum
    }, 0)

  const roundWagerAggregate = wagerRounds.reduce((sum, round) => {
    const scores = roundScores[round.roundId]
    if (!scores) return sum
    const net = calcRoundWagerNet(round, scores, uid)
    return net !== null ? sum + net : sum
  }, 0)

  const aggregate = sideBetAggregate + roundWagerAggregate

  const aggregateColor = aggregate > 0 ? 'text-blue-400' : aggregate < 0 ? 'text-red-400' : 'text-gray-400'
  const aggregateLabel =
    aggregate > 0
      ? `+$${aggregate.toFixed(2)}`
      : aggregate < 0
        ? `-$${Math.abs(aggregate).toFixed(2)}`
        : '$0.00'

  const loading = betsLoading || roundsLoading

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-brand">My Bets</h1>

      {/* Aggregate */}
      <div className="bg-card-bg border border-card-border rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted font-medium">Net Winnings</span>
        <span className={`text-lg font-bold ${aggregateColor}`}>{aggregateLabel}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Round Bets */}
          {wagerRounds.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Round Bets</h2>
              <div className="flex flex-col gap-3">
                {wagerRounds.map((round) => {
                  const scores = roundScores[round.roundId]
                  const net = scores ? calcRoundWagerNet(round, scores, uid) : null
                  const date = round.date?.toDate()
                  const dateStr = date
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'

                  let moneyEl: React.ReactNode
                  if (net === null) {
                    moneyEl = <span className="text-xs text-gray-500 italic">Calculating…</span>
                  } else if (net === 0) {
                    moneyEl = <span className="text-sm text-gray-400 font-medium">Tie</span>
                  } else if (net > 0) {
                    moneyEl = <span className="text-sm font-bold text-blue-400">+${net.toFixed(2)}</span>
                  } else {
                    moneyEl = <span className="text-sm font-bold text-red-400">-${Math.abs(net).toFixed(2)}</span>
                  }

                  return (
                    <button
                      key={round.roundId}
                      type="button"
                      onClick={() => navigate(`/rounds/${round.roundId}`)}
                      className="w-full text-left bg-card-bg border border-card-border rounded-xl p-4 flex items-center justify-between gap-3 hover:border-blue-600/50 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-brand truncate">{round.name}</span>
                        <span className="text-xs text-muted truncate">{round.courseName}</span>
                        <span className="text-xs text-muted">{dateStr}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {moneyEl}
                        <span className="text-xs text-muted">${round.wager!.toFixed(2)} ante</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Side Bets */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Side Bets</h2>
            {bets.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">You have no side bets yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {bets.map((bet) => {
                  const round = roundsMap[bet.roundId]
                  const net = calcSideBetNet(bet, uid)
                  const date = round?.date?.toDate()
                  const dateStr = date
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'

                  let moneyEl: React.ReactNode
                  if (bet.status === 'settled') {
                    if (net === 0) {
                      moneyEl = <span className="text-sm text-gray-400 font-medium">Tie</span>
                    } else if (net !== null && net > 0) {
                      moneyEl = <span className="text-sm font-bold text-blue-400">+${net.toFixed(2)}</span>
                    } else if (net !== null && net < 0) {
                      moneyEl = <span className="text-sm font-bold text-red-400">-${Math.abs(net).toFixed(2)}</span>
                    }
                  } else {
                    moneyEl = <span className="text-xs text-gray-500 italic capitalize">{bet.status}</span>
                  }

                  return (
                    <button
                      key={bet.sideBetId}
                      type="button"
                      onClick={() => navigate(`/rounds/${bet.roundId}/side-bets/${bet.sideBetId}`)}
                      className="w-full text-left bg-card-bg border border-card-border rounded-xl p-4 flex items-center justify-between gap-3 hover:border-blue-600/50 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-brand truncate">
                          {BET_TYPE_LABELS[bet.type]}
                        </span>
                        <span className="text-xs text-muted truncate">
                          {round?.courseName ?? '—'}
                        </span>
                        <span className="text-xs text-muted">{dateStr}</span>
                      </div>
                      <div className="shrink-0">{moneyEl}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {wagerRounds.length === 0 && bets.length === 0 && (
            <p className="text-sm text-muted text-center py-8">You have no bets yet.</p>
          )}
        </>
      )}
    </div>
  )
}
