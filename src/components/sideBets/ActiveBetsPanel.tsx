import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSideBets } from '@/hooks/useSideBets'
import { scoreService } from '@/services/scoreService'
import { useGroups } from '@/hooks/useGroup'
import { nassauSegmentStatus } from '@/lib/scoring'
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
    : bet.type === 'CHALLENGE_GROSS' ? 'Challenge (Gross)'
    : 'Challenge (Net)'

  function betLink(bet: SideBet) {
    navigate(`/rounds/${roundId}/side-bets/${bet.sideBetId}?from=scorecard&groupId=${groupId}`)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Invited bets — always shown when present */}
      {invitedBets.length > 0 && (
        <div className="bg-blue-600/10 border border-blue-600/40 rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-400">
              Bet Invites ({invitedBets.length})
            </span>
            <span className="text-xs text-blue-400 animate-pulse">Action needed</span>
          </div>
          <div className="border-t border-blue-600/30 flex flex-col divide-y divide-blue-600/20">
            {invitedBets.map((bet) => (
              <button
                key={bet.sideBetId}
                type="button"
                onClick={() => betLink(bet)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-blue-600/10 transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-blue-300">{betTypeLabel(bet)}</span>
                  <span className="text-xs text-blue-400">${bet.wagerPerPerson.toFixed(2)} / {bet.type.startsWith('NASSAU') ? 'segment' : 'person'}</span>
                </div>
                <span className="text-xs font-semibold text-blue-300 shrink-0">Tap to respond →</span>
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
        <div className="bg-card-bg border border-blue-600/40 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={toggle}
            className="w-full px-4 py-3 flex items-center justify-between text-left bg-blue-600/10"
          >
            <span className="text-sm font-semibold text-blue-400">Side Bets ({myBets.length})</span>
            <svg
              className={`w-4 h-4 text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="border-t border-blue-600/30 flex flex-col divide-y divide-card-border">
              {myBets.map((bet) => {
                const isNassau = bet.type === 'NASSAU_GROSS' || bet.type === 'NASSAU_NET'
                const useNet = bet.type === 'NASSAU_NET' || bet.type === 'CHALLENGE_NET'
                return (
                  <button
                    key={bet.sideBetId}
                    type="button"
                    onClick={() => betLink(bet)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-card-bg transition-colors"
                  >
                    <span className="text-sm font-semibold text-brand shrink-0">{betTypeLabel(bet)}</span>
                    {isNassau ? (
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
