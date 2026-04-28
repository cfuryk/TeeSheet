import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSideBets } from '@/hooks/useSideBets'
import { scoreService } from '@/services/scoreService'
import { useGroups } from '@/hooks/useGroup'
import { nassauSegmentStatus, computeMatchScore } from '@/lib/scoring'
import { usePanelState } from '@/hooks/usePanelState'
import type { Score, SideBet } from '@/types'

interface Props {
  roundId: string
  uid: string
  groupId: string
}

function nassauSegmentLabel(
  bet: SideBet,
  scores: Record<string, Score>,
  segment: 'front' | 'back' | 'total',
  useNet: boolean,
  uid: string,
): string {
  const { leaders, playerScores } = nassauSegmentStatus(bet.participantIds, scores, segment, useNet)
  const myScore = playerScores[uid]
  if (myScore === null) return '—'
  const isLeading = leaders.includes(uid)
  const isTied = leaders.length > 1
  if (isTied && isLeading) return 'Tied'
  if (isLeading) return `+$${bet.wagerPerPerson.toFixed(0)}`
  const opponents = bet.participantIds.filter((id) => id !== uid)
  const bestOpponent = opponents.reduce<number | null>((best, id) => {
    const s = playerScores[id]
    if (s === null) return best
    return best === null ? s : Math.min(best, s)
  }, null)
  if (bestOpponent === null || bestOpponent >= myScore) return 'Tied'
  return `-$${bet.wagerPerPerson.toFixed(0)}`
}

function challengeStanding(
  bet: SideBet,
  scores: Record<string, Score>,
  useNet: boolean,
  uid: string,
): string {
  const myScore = scores[uid]
  if (!myScore || myScore.scores.length === 0) return '—'
  const myTotal = useNet
    ? myScore.scores.reduce((s, h) => s + h.netScore, 0)
    : myScore.scores.reduce((s, h) => s + h.grossScore, 0)
  const others = bet.participantIds
    .filter((id) => id !== uid)
    .map((id) => {
      const sc = scores[id]
      if (!sc || sc.scores.length === 0) return null
      return useNet
        ? sc.scores.reduce((s, h) => s + h.netScore, 0)
        : sc.scores.reduce((s, h) => s + h.grossScore, 0)
    })
    .filter((v): v is number => v !== null)
  if (others.length === 0) return '—'
  const best = Math.min(...others)
  if (myTotal < best) return 'Leading'
  if (myTotal === best) return 'Tied'
  return `+${myTotal - best} back`
}

export function ActiveBetsPanel({ roundId, uid, groupId }: Props) {
  const [open, toggle] = usePanelState('active-bets')
  const navigate = useNavigate()
  const { sideBets } = useSideBets(roundId)
  const { groups } = useGroups(roundId)
  const [scores, setScores] = useState<Record<string, Score>>({})

  const myBets = sideBets.filter(
    (b) => b.participantIds.includes(uid) && (b.status === 'active' || b.status === 'pending'),
  )
  const invitedBets = sideBets.filter(
    (b) => b.invitedIds.includes(uid) && b.status === 'pending',
  )

  useEffect(() => {
    if (groups.length === 0 || myBets.length === 0) return
    Promise.all(
      groups.map((g) => scoreService.getAllScores(roundId, g.groupId))
    ).then((results) => {
      const map: Record<string, Score> = {}
      for (const sc of results.flat()) map[sc.golferId] = sc
      setScores(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, groups.length, myBets.length])

  const betTypeLabel = (bet: SideBet) =>
    bet.type === 'NASSAU_GROSS' ? 'Nassau (Gross)'
    : bet.type === 'NASSAU_NET' ? 'Nassau (Net)'
    : bet.type === 'STROKE_GROSS' ? 'Stroke (Gross)'
    : bet.type === 'STROKE_NET' ? 'Stroke (Net)'
    : bet.type === 'MATCH_GROSS' ? 'Match (Gross)'
    : bet.type === 'MATCH_NET' ? 'Match (Net)'
    : bet.type === 'HAMMER' ? 'Hammer'
    : bet.type === 'SKINS_GROSS' ? 'Skins (Gross)'
    : bet.type === 'SKINS_NET' ? 'Skins (Net)'
    : bet.type

  function betLink(bet: SideBet) {
    navigate(`/rounds/${roundId}/side-bets/${bet.sideBetId}?from=scorecard&groupId=${groupId}`)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Invited bets — always shown when present */}
      {invitedBets.length > 0 && (
        <div className="bg-card-bg rounded-xl border border-card-border overflow-hidden">
          <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-white">
              Bet Invites ({invitedBets.length})
            </span>
            <span className="text-xs font-semibold text-white/70 animate-pulse">Action needed</span>
          </div>
          <div className="flex flex-col divide-y divide-card-border">
            {invitedBets.map((bet) => (
              <button
                key={bet.sideBetId}
                type="button"
                onClick={() => betLink(bet)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-blue-600/5 transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-blue-600">{betTypeLabel(bet)}</span>
                  <span className="text-xs text-muted">${bet.wagerPerPerson.toFixed(2)} / {bet.type.startsWith('NASSAU') ? 'segment' : 'person'}</span>
                </div>
                <span className="text-xs font-semibold text-blue-600 shrink-0">Tap to respond →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active bets panel */}
      {myBets.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate(`/rounds/${roundId}/side-bets?from=scorecard&groupId=${groupId}`)}
          className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          Side Bets
        </button>
      ) : (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={toggle}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left bg-blue-600"
          >
            <span className="text-sm font-bold text-white">Side Bets ({myBets.length})</span>
            <svg
              className={`w-4 h-4 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="flex flex-col divide-y divide-card-border">
              {myBets.map((bet) => {
                const isNassau = bet.type === 'NASSAU_GROSS' || bet.type === 'NASSAU_NET'
                const isHammer = bet.type === 'HAMMER'
                const isSkins = bet.type === 'SKINS_GROSS' || bet.type === 'SKINS_NET'
                const isMatch = bet.type === 'MATCH_GROSS' || bet.type === 'MATCH_NET'
                const useNet = bet.type === 'NASSAU_NET' || bet.type === 'STROKE_NET' || bet.type === 'MATCH_NET' || bet.type === 'SKINS_NET'

                // Hammer running net from current user's perspective
                let hammerLabel = '—'
                let hammerColor = 'text-muted'
                if (isHammer && bet.hammerConfig) {
                  const cfg = bet.hammerConfig
                  const onSideA = cfg.sideA.includes(uid)
                  let net = 0
                  for (const r of cfg.holeResults) {
                    if (r.foldedBy === 'B' || r.winningSide === 'A') net += r.stake
                    else if (r.foldedBy === 'A' || r.winningSide === 'B') net -= r.stake
                  }
                  const myNet = onSideA ? net : -net
                  if (myNet > 0) { hammerLabel = `+$${myNet.toFixed(2)}`; hammerColor = 'text-green-400' }
                  else if (myNet < 0) { hammerLabel = `-$${Math.abs(myNet).toFixed(2)}`; hammerColor = 'text-danger' }
                  else hammerLabel = 'Even'
                }

                // Skins: live estimate from skinsResult or compute from current scores
                let skinsLabel = '—'
                let skinsColor = 'text-muted'
                if (isSkins) {
                  if (bet.skinsResult) {
                    const earned = bet.skinsResult.earningsByPlayer[uid] ?? 0
                    const net = earned - bet.wagerPerPerson
                    if (net > 0) { skinsLabel = `+$${net.toFixed(2)}`; skinsColor = 'text-green-400' }
                    else if (net < 0) { skinsLabel = `-$${Math.abs(net).toFixed(2)}`; skinsColor = 'text-danger' }
                    else skinsLabel = 'Even'
                  } else {
                    // Live: count holes won so far
                    const myScores = scores[uid]
                    if (myScores) {
                      let skinsWon = 0
                      for (let hole = 1; hole <= 18; hole++) {
                        const myHole = myScores.scores.find((h) => h.hole === hole)
                        if (!myHole) continue
                        const myScore = useNet ? myHole.netScore : myHole.grossScore
                        if (myScore == null) continue
                        const allScored = bet.participantIds.every((pid) => {
                          const sc = scores[pid]
                          const hs = sc?.scores.find((h) => h.hole === hole)
                          return hs && (useNet ? hs.netScore : hs.grossScore) != null
                        })
                        if (!allScored) continue
                        const allHoleScores = bet.participantIds.map((pid) => {
                          const sc = scores[pid]
                          const hs = sc?.scores.find((h) => h.hole === hole)
                          return useNet ? hs?.netScore : hs?.grossScore
                        }).filter((s): s is number => s != null)
                        const minScore = Math.min(...allHoleScores)
                        const winners = bet.participantIds.filter((pid) => {
                          const sc = scores[pid]
                          const hs = sc?.scores.find((h) => h.hole === hole)
                          const s = useNet ? hs?.netScore : hs?.grossScore
                          return s === minScore
                        })
                        if (winners.length === 1 && winners[0] === uid) skinsWon++
                      }
                      skinsLabel = `${skinsWon} skin${skinsWon !== 1 ? 's' : ''}`
                      skinsColor = skinsWon > 0 ? 'text-green-400' : 'text-muted'
                    }
                  }
                }

                // Match Play running score from current user's perspective
                let matchLabel = '—'
                let matchColor = 'text-muted'
                if (isMatch && bet.matchPlayers) {
                  const mp = bet.matchPlayers
                  const { aWins, bWins, holesPlayed, matchStatus } = computeMatchScore(mp.sideA, mp.sideB, scores, useNet)
                  if (holesPlayed === 0) {
                    matchLabel = '—'
                  } else {
                    const myOnA = mp.sideA.includes(uid)
                    const myOnB = mp.sideB.includes(uid)
                    const aUp = aWins - bWins
                    const myUp = myOnA ? aUp : myOnB ? -aUp : 0
                    if (myUp > 0) { matchLabel = matchStatus; matchColor = 'text-green-400' }
                    else if (myUp < 0) { matchLabel = matchStatus; matchColor = 'text-danger' }
                    else { matchLabel = matchStatus; matchColor = 'text-muted' }
                  }
                }

                return (
                  <button
                    key={bet.sideBetId}
                    type="button"
                    onClick={() => betLink(bet)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-card-bg transition-colors"
                  >
                    <span className="text-sm font-semibold text-brand shrink-0">{betTypeLabel(bet)}</span>
                    {isHammer ? (
                      <span className={`text-xs font-medium ml-auto shrink-0 ${hammerColor}`}>
                        {hammerLabel}
                      </span>
                    ) : isSkins ? (
                      <span className={`text-xs font-medium ml-auto shrink-0 ${skinsColor}`}>
                        {skinsLabel}
                      </span>
                    ) : isNassau ? (
                      <div className="flex gap-2 text-xs font-medium shrink-0 ml-auto">
                        {(['front', 'back', 'total'] as const).map((seg) => {
                          const val = nassauSegmentLabel(bet, scores, seg, useNet, uid)
                          const color = val.startsWith('+') ? 'text-green-400'
                            : val.startsWith('-') ? 'text-danger'
                            : 'text-muted'
                          const segLabel = seg === 'front' ? 'F' : seg === 'back' ? 'B' : 'T'
                          return <span key={seg} className={color}>{segLabel}: {val}</span>
                        })}
                      </div>
                    ) : isMatch ? (
                      <span className={`text-xs font-medium ml-auto shrink-0 ${matchColor}`}>
                        {matchLabel}
                      </span>
                    ) : (
                      <span className={`text-xs font-medium ml-auto shrink-0 ${
                        challengeStanding(bet, scores, useNet, uid) === 'Leading' ? 'text-green-400'
                        : challengeStanding(bet, scores, useNet, uid) === 'Tied' ? 'text-muted'
                        : challengeStanding(bet, scores, useNet, uid) === '—' ? 'text-muted'
                        : 'text-danger'
                      }`}>
                        {challengeStanding(bet, scores, useNet, uid)}
                      </span>
                    )}
                    <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )
              })}
              <div className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => navigate(`/rounds/${roundId}/side-bets?from=scorecard&groupId=${groupId}`)}
                  className="w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                >
                  View All Bets
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
