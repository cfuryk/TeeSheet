import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRound } from '@/hooks/useRound'
import { useSideBets } from '@/hooks/useSideBets'
import { scoreService } from '@/services/scoreService'
import { userService } from '@/services/userService'
import { sideBetService } from '@/services/sideBetService'
import { nassauSegmentStatus, computeMatchScore } from '@/lib/scoring'
import { Spinner } from '@/components/ui'
import { BET_TYPE_LABELS } from '@/pages/SideBetsPage'
import type { Score, SideBet, SideBetType } from '@/types'

function isNetType(type: SideBetType) {
  return type === 'STROKE_NET' || type === 'NASSAU_NET' || type === 'MATCH_NET' || type === 'SKINS_NET'
}

function isNassauType(type: SideBetType) {
  return type === 'NASSAU_GROSS' || type === 'NASSAU_NET'
}

export function SideBetDetailPage() {
  const { roundId, sideBetId } = useParams<{ roundId: string; sideBetId: string }>()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  const fromGroupId = searchParams.get('groupId')
  const { currentUser } = useAuth()
  const { round, loading: roundLoading } = useRound(roundId!)
  const { sideBets, loading: betsLoading } = useSideBets(roundId!)
  const navigate = useNavigate()

  function handleBack() {
    if (from === 'scorecard' && fromGroupId)
      return navigate(`/rounds/${roundId}/groups/${fromGroupId}/scorecard`)
    if (from === 'admin')
      return navigate('/admin/bets')
    navigate(`/rounds/${roundId}/side-bets`)
  }

  const backLabel = from === 'scorecard' ? 'Back to Scorecard'
    : from === 'admin' ? 'Back to Admin Bets'
    : 'Back to Side Bets'

  const [scores, setScores] = useState<Record<string, Score>>({})
  const [names, setNames] = useState<Record<string, string>>({})
  const [namesLoaded, setNamesLoaded] = useState(false)
  const [actionError, setActionError] = useState('')
  const [inviteIds, setInviteIds] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  const bet = sideBets.find((b) => b.sideBetId === sideBetId)

  useEffect(() => {
    if (!bet || !round) return
    const allIds = [...new Set([
      ...bet.participantIds,
      ...bet.invitedIds,
      ...(bet.requestIds ?? []),
      ...(bet.declinedIds ?? []),
      ...(round.memberIds ?? []),
    ])]
    Promise.all(
      allIds.map((uid) => userService.getProfile(uid).then((p) => ({ uid, name: p?.displayName ?? uid })))
    ).then((results) => {
      const map: Record<string, string> = {}
      for (const { uid, name } of results) map[uid] = name
      setNames(map)
      setNamesLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bet?.sideBetId, round?.roundId])

  useEffect(() => {
    if (!round || !bet || bet.participantIds.length === 0) return
    const found: Record<string, Score> = {}
    Promise.all(
      round.groupIds.map((groupId) =>
        scoreService.getAllScores(roundId!, groupId).then((groupScores) => {
          for (const sc of groupScores) {
            if (bet.participantIds.includes(sc.golferId)) {
              found[sc.golferId] = sc
            }
          }
        })
      )
    ).then(() => setScores({ ...found }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, bet?.sideBetId])

  const uid = currentUser!.uid

  async function handleAccept() {
    if (!bet) return
    setActionError('')
    try {
      await sideBetService.acceptInvite(roundId!, bet.sideBetId, uid)
    } catch {
      setActionError('Failed to accept invite.')
    }
  }

  async function handleDecline() {
    if (!bet) return
    setActionError('')
    try {
      await sideBetService.declineInvite(roundId!, bet.sideBetId, uid, bet)
    } catch {
      setActionError('Failed to decline invite.')
    }
  }

  async function handleApproveRequest(requestUid: string) {
    if (!bet) return
    setActionError('')
    try {
      await sideBetService.approveJoinRequest(roundId!, bet.sideBetId, requestUid)
    } catch {
      setActionError('Failed to approve request.')
    }
  }

  async function handleDenyRequest(requestUid: string) {
    if (!bet) return
    setActionError('')
    try {
      await sideBetService.denyJoinRequest(roundId!, bet.sideBetId, requestUid)
    } catch {
      setActionError('Failed to deny request.')
    }
  }

  async function handleInvite() {
    if (!bet || inviteIds.length === 0) return
    setInviting(true)
    setActionError('')
    try {
      await sideBetService.invitePlayers(roundId!, bet.sideBetId, inviteIds)
      setInviteIds([])
      setShowInvite(false)
    } catch {
      setActionError('Failed to send invites.')
    } finally {
      setInviting(false)
    }
  }

  async function handleCancel() {
    if (!bet) return
    setActionError('')
    try {
      await sideBetService.cancelSideBet(roundId!, bet.sideBetId)
      handleBack()
    } catch {
      setActionError('Failed to cancel bet.')
    }
  }

  if (roundLoading || betsLoading) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  if (!bet) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors self-start"
        >
          {backLabel}
        </button>
        <p className="text-muted text-center py-8">Bet not found.</p>
      </div>
    )
  }

  if (!namesLoaded) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  const b: SideBet = bet
  const useNet = isNetType(b.type)
  const isNassau = isNassauType(b.type)
  const isHammer = b.type === 'HAMMER'
  const isSkins = b.type === 'SKINS_GROSS' || b.type === 'SKINS_NET'
  const isMatch = b.type === 'MATCH_GROSS' || b.type === 'MATCH_NET'

  const isInvited = b.invitedIds.includes(uid)
  const isParticipant = b.participantIds.includes(uid)
  const hasRequested = (b.requestIds ?? []).includes(uid)
  const canAccept = isInvited && b.status === 'pending'

  const alreadyOnBet = new Set([
    ...b.participantIds,
    ...b.invitedIds,
    ...(b.requestIds ?? []),
    ...(b.declinedIds ?? []),
  ])
  const inviteableMembers = (round?.memberIds ?? []).filter((id) => !alreadyOnBet.has(id))
  const canDecline = isInvited && b.status === 'pending'
  const canCancel = b.createdBy === uid && b.status === 'pending'
  const pendingRequests = isParticipant ? (b.requestIds ?? []) : []

  function getName(id: string) {
    return names[id] ?? id
  }

  function getTotal(id: string): number | null {
    const sc = scores[id]
    if (!sc || sc.scores.length === 0) return null
    if (useNet) return sc.scores.reduce((s, h) => s + h.netScore, 0)
    return sc.scores.reduce((s, h) => s + h.grossScore, 0)
  }

  const ranked = b.participantIds
    .map((id) => ({ id, total: getTotal(id), holes: scores[id]?.scores.length ?? 0 }))
    .sort((a, b) => {
      if (a.total === null && b.total === null) return 0
      if (a.total === null) return 1
      if (b.total === null) return -1
      return a.total - b.total
    })

  const leader = ranked.find((r) => r.total !== null)

  function standingBlock() {
    if (b.status === 'cancelled') {
      return <p className="text-sm text-muted italic">This bet was cancelled.</p>
    }

    if (b.status === 'pending') {
      if (b.invitedIds.length > 0) {
        return (
          <p className="text-sm text-muted italic">
            Waiting on: {b.invitedIds.map(getName).join(', ')}
          </p>
        )
      }
      return <p className="text-sm text-muted italic">Bet is open — waiting for round to begin.</p>
    }

    // Hammer standing — running net per side
    if (isHammer) {
      const cfg = b.hammerConfig
      if (!cfg) return <p className="text-sm text-muted italic">No data yet.</p>
      const sideANames = cfg.sideA.map(getName).join(' & ')
      const sideBNames = cfg.sideB.map(getName).join(' & ')
      // Deduplicate by hole (arrayUnion on objects can produce duplicates)
      const uniqueResults = Object.values(
        Object.fromEntries(cfg.holeResults.map((r) => [r.hole, r]))
      )
      let sideANet = 0
      for (const r of uniqueResults) {
        if (r.foldedBy === 'B' || r.winningSide === 'A') sideANet += r.stake
        else if (r.foldedBy === 'A' || r.winningSide === 'B') sideANet -= r.stake
      }
      const holesPlayed = uniqueResults.length
      const netColor = (n: number) => n > 0 ? 'text-green-600' : n < 0 ? 'text-danger' : 'text-muted'
      const fmt = (n: number) => n === 0 ? 'Even' : n > 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand">{sideANames}</span>
            <span className={`text-sm font-bold ${netColor(sideANet)}`}>{fmt(sideANet)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand">{sideBNames}</span>
            <span className={`text-sm font-bold ${netColor(-sideANet)}`}>{fmt(-sideANet)}</span>
          </div>
          <p className="text-xs text-muted">{holesPlayed}/18 holes recorded · ${cfg.baseStake.toFixed(2)} base stake</p>
        </div>
      )
    }

    // Skins standing
    if (isSkins) {
      const netColor = (n: number) => n > 0 ? 'text-green-600' : n < 0 ? 'text-danger' : 'text-muted'
      const fmt = (n: number) => n === 0 ? 'Even' : n > 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`
      if (b.skinsResult) {
        const { totalPot, skinsCount, payoutPerSkin, earningsByPlayer } = b.skinsResult
        return (
          <div className="flex flex-col gap-2">
            {b.participantIds.map((pid) => {
              const earned = earningsByPlayer[pid] ?? 0
              const net = earned - b.wagerPerPerson
              const skins = b.skinsResult!.holeResults.filter((r) => r.winnerId === pid).length
              return (
                <div key={pid} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-brand">{getName(pid)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">{skins} skin{skins !== 1 ? 's' : ''}</span>
                    <span className={`text-sm font-bold ${netColor(net)}`}>{fmt(net)}</span>
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-muted">
              Pot: ${totalPot.toFixed(2)} · {skinsCount} skin{skinsCount !== 1 ? 's' : ''} · ${payoutPerSkin.toFixed(2)} each
            </p>
          </div>
        )
      }
      // Active — show live skin counts from scores
      const skinsWonBy: Record<string, number> = {}
      for (let hole = 1; hole <= 18; hole++) {
        const holeScores: { uid: string; score: number }[] = []
        for (const uid of b.participantIds) {
          const sc = Object.values(scores).find((s) => s.golferId === uid)
          const hs = sc?.scores.find((h) => h.hole === hole)
          const score = hs ? (useNet ? hs.netScore : hs.grossScore) : null
          if (score != null) holeScores.push({ uid, score })
        }
        if (holeScores.length < b.participantIds.length) continue
        const min = Math.min(...holeScores.map((h) => h.score))
        const winners = holeScores.filter((h) => h.score === min)
        if (winners.length === 1) skinsWonBy[winners[0].uid] = (skinsWonBy[winners[0].uid] ?? 0) + 1
      }
      const totalPot = b.participantIds.length * b.wagerPerPerson
      const totalSkins = Object.values(skinsWonBy).reduce((s, n) => s + n, 0)
      const payoutEst = totalSkins > 0 ? totalPot / totalSkins : 0
      return (
        <div className="flex flex-col gap-2">
          {b.participantIds.map((pid) => {
            const skins = skinsWonBy[pid] ?? 0
            const earned = skins * payoutEst
            const net = earned - b.wagerPerPerson
            return (
              <div key={pid} className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand">{getName(pid)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{skins} skin{skins !== 1 ? 's' : ''}</span>
                  <span className={`text-sm font-bold ${netColor(net)}`}>{fmt(net)}</span>
                </div>
              </div>
            )
          })}
          <p className="text-xs text-muted">Pot: ${totalPot.toFixed(2)} · {totalSkins} skin{totalSkins !== 1 ? 's' : ''} recorded so far</p>
        </div>
      )
    }

    // Nassau settled
    if (b.status === 'settled' && isNassau) {
      const nr = b.nassauResult
      function segmentSettled(winners: string[] | null | undefined, label: string) {
        if (!winners) return <span className="text-muted">—</span>
        if (winners.length === 0) return <span className="text-muted">Tied</span>
        return (
          <span className="text-green-400 font-semibold">
            {label}: {winners.map(getName).join(' / ')} +${b.wagerPerPerson.toFixed(2)}
          </span>
        )
      }
      return (
        <div className="flex flex-col gap-1.5">
          <div>{segmentSettled(nr?.front9Winners, 'Front 9')}</div>
          <div>{segmentSettled(nr?.back9Winners, 'Back 9')}</div>
          <div>{segmentSettled(nr?.totalWinners, 'Total')}</div>
        </div>
      )
    }

    // Match Play standing — before the generic settled block
    if (isMatch && b.matchPlayers) {
      const mp = b.matchPlayers
      const sideANames = mp.sideA.map(getName).join(' & ')
      const sideBNames = mp.sideB.map(getName).join(' & ')

      if (b.status === 'settled') {
        const winners = b.winnersIds ?? []
        const wonSide = winners.length === 0 ? null
          : mp.sideA.some((uid) => winners.includes(uid)) ? 'A' : 'B'
        if (wonSide === null) {
          return (
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold text-brand">Match Halved</p>
              <p className="text-xs text-muted">No money changes hands</p>
            </div>
          )
        }
        const { holeByHole, aWins, bWins } = computeMatchScore(mp.sideA, mp.sideB, scores, useNet)
        const holesPlayed = holeByHole.length
        const holesRemaining = 18 - holesPlayed
        const absUp = Math.abs(aWins - bWins)
        const margin = holesRemaining === 0 ? `${absUp} UP` : `${absUp}&${holesRemaining}`
        const winnerNames = wonSide === 'A' ? sideANames : sideBNames
        const loserNames = wonSide === 'A' ? sideBNames : sideANames
        const wager = b.wagerPerPerson
        return (
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-blue-400">{winnerNames} won {margin}</p>
            <p className="text-sm text-muted">
              {loserNames} paid <span className="text-brand font-medium">${wager.toFixed(2)}</span> / person
            </p>
          </div>
        )
      }

      // Active — compute live match score
      const { holeByHole, aWins, bWins, holesPlayed, matchStatus } = computeMatchScore(mp.sideA, mp.sideB, scores, useNet)
      const aUp = aWins - bWins
      const netColorA = aUp > 0 ? 'text-green-600' : aUp < 0 ? 'text-danger' : 'text-muted'
      const netColorB = aUp < 0 ? 'text-green-600' : aUp > 0 ? 'text-danger' : 'text-muted'
      const displayA = aUp > 0 ? `${aWins - bWins} UP` : aUp === 0 ? 'AS' : `${bWins - aWins} DOWN`
      const displayB = aUp < 0 ? `${bWins - aWins} UP` : aUp === 0 ? 'AS' : `${aWins - bWins} DOWN`
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand">{sideANames}</span>
            <span className={`text-sm font-bold ${netColorA}`}>{displayA}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand">{sideBNames}</span>
            <span className={`text-sm font-bold ${netColorB}`}>{displayB}</span>
          </div>
          <p className="text-xs text-muted">{holesPlayed}/18 holes played · {matchStatus}</p>
          {holeByHole.length === 0 && <p className="text-xs text-muted italic">No holes played yet</p>}
        </div>
      )
    }

    // Stroke / Match settled
    if (b.status === 'settled') {
      const winners = b.winnersIds ?? []
      if (winners.length === 0) {
        return <p className="text-base font-semibold text-brand">Complete tie — no money changes hands</p>
      }
      const pot = b.participantIds.length * b.wagerPerPerson
      const eachWinnerCollects = pot / winners.length
      return (
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold text-blue-400">
            {winners.map(getName).join(' & ')} won
          </p>
          <p className="text-sm text-muted">
            Pot: <span className="text-brand font-medium">${pot.toFixed(2)}</span>
            {' '}({b.participantIds.length} × ${b.wagerPerPerson.toFixed(2)})
          </p>
          <p className="text-sm text-muted">
            Each winner collects <span className="text-brand font-medium">${eachWinnerCollects.toFixed(2)}</span>
          </p>
          <p className="text-sm text-muted">
            Each loser paid in <span className="text-brand font-medium">${b.wagerPerPerson.toFixed(2)}</span>
          </p>
        </div>
      )
    }

    // Active Nassau — live segment standings
    if (isNassau) {
      const scoreMap = scores
      const segments: { key: 'front' | 'back' | 'total'; label: string }[] = [
        { key: 'front', label: 'Front 9' },
        { key: 'back', label: 'Back 9' },
        { key: 'total', label: 'Total' },
      ]
      return (
        <div className="flex flex-col gap-3">
          {segments.map(({ key, label }) => {
            const { leaders, playerScores, complete } = nassauSegmentStatus(
              b.participantIds, scoreMap, key, useNet
            )
            const anyScored = b.participantIds.some((id) => playerScores[id] !== null)
            return (
              <div key={key}>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{label}</p>
                {!anyScored ? (
                  <p className="text-xs text-muted italic">No scores yet</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {b.participantIds.map((id) => {
                      const segScore = playerScores[id]
                      const isLeading = leaders.includes(id) && segScore !== null
                      return (
                        <div key={id} className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isLeading ? 'text-green-400' : 'text-brand'}`}>
                            {getName(id)}{isLeading && leaders.length === 1 && complete ? ' ✓' : ''}
                          </span>
                          <span className="text-xs text-muted">
                            {segScore !== null ? segScore : '—'}
                          </span>
                        </div>
                      )
                    })}
                    {leaders.length > 1 && anyScored && (
                      <p className="text-xs text-muted italic mt-0.5">Tied</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    // Active stroke / match — live standing
    if (!leader || leader.total === null) {
      return <p className="text-sm text-muted italic">No scores yet</p>
    }

    return (
      <div className="flex flex-col gap-1.5">
        {ranked.map((r, i) => {
          const isLeading = r.total !== null && r.total === leader.total
          const behind = r.total !== null && leader.total !== null ? r.total - leader.total : null
          return (
            <div key={r.id} className="flex items-center gap-2">
              <span className="text-xs text-muted w-4">{r.total !== null ? i + 1 : '—'}</span>
              <span className={`text-sm font-medium ${isLeading ? 'text-blue-300' : 'text-brand'}`}>
                {getName(r.id)}
              </span>
              {r.total !== null ? (
                <span className="text-xs text-muted ml-auto">
                  {r.total} {useNet ? 'net' : 'gross'}
                  {behind !== null && behind > 0 && ` (+${behind})`}
                  {' '}· {r.holes}/18
                </span>
              ) : (
                <span className="text-xs text-muted ml-auto">No scores</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const statusBadgeClass = {
    pending:   'bg-yellow-500/10 text-yellow-700 ring-1 ring-yellow-500/30',
    active:    'bg-blue-600/10 text-blue-600 ring-1 ring-blue-600/30',
    settled:   'bg-green-600/10 text-green-700 ring-1 ring-green-600/30',
    cancelled: 'bg-red-500/10 text-danger ring-1 ring-red-500/30',
  } as const

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          {backLabel}
        </button>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass[b.status]}`}>
          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
        </span>
      </div>

      {/* Bet info */}
      <div className="bg-card-bg border border-card-border rounded-xl p-4 flex flex-col gap-1">
        <p className="text-base font-semibold text-brand">{BET_TYPE_LABELS[b.type] ?? b.type}</p>
        {isNassau ? (
          <p className="text-sm text-muted">
            ${b.wagerPerPerson.toFixed(2)} <span className="text-muted">/ segment · Front 9, Back 9, Total · max ${(b.wagerPerPerson * 3).toFixed(2)} / person</span>
          </p>
        ) : (
          <p className="text-sm text-muted">
            ${b.wagerPerPerson.toFixed(2)} <span className="text-muted">/ person · everyone vs everyone</span>
          </p>
        )}
      </div>

      {/* Players */}
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <div className="bg-blue-600 px-4 py-2.5">
          <h2 className="text-sm font-bold text-white">Players</h2>
        </div>
        <div className="flex flex-col divide-y divide-card-border">
          {b.participantIds.map((id) => (
            <div key={id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-medium text-brand">{getName(id)}</span>
              <span className="text-xs font-semibold text-green-700 bg-green-600/10 rounded-full px-2 py-0.5 ring-1 ring-green-600/30">{id === b.createdBy ? 'Initiated' : 'Accepted'}</span>
            </div>
          ))}
          {b.invitedIds.map((id) => (
            <div key={id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-medium text-muted">{getName(id)}</span>
              <span className="text-xs font-semibold text-yellow-700 bg-yellow-500/10 rounded-full px-2 py-0.5 ring-1 ring-yellow-500/30">Invited</span>
            </div>
          ))}
          {(b.requestIds ?? []).map((id) => (
            <div key={id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-medium text-muted">{getName(id)}</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-600/10 rounded-full px-2 py-0.5 ring-1 ring-blue-600/30">Requested</span>
            </div>
          ))}
        </div>

        {/* Invite more players — only for participants, pending/active, with someone left to invite */}
        {isParticipant && b.status !== 'settled' && b.status !== 'cancelled' && inviteableMembers.length > 0 && (
          <div className="border-t border-card-border px-4 py-3 flex flex-col gap-2">
            {!showInvite ? (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="w-full h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
              >
                + Invite Players
              </button>
            ) : (
              <>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                  {inviteableMembers.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setInviteIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        inviteIds.includes(id)
                          ? 'bg-blue-600/10 text-blue-600 ring-1 ring-blue-600/30'
                          : 'text-brand hover:bg-blue-600/5'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        inviteIds.includes(id) ? 'bg-blue-600 border-blue-600' : 'border-card-border'
                      }`}>
                        {inviteIds.includes(id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {getName(id)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={inviteIds.length === 0 || inviting}
                    className="flex-1 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                  >
                    {inviting ? 'Sending...' : `Send Invite${inviteIds.length > 1 ? 's' : ''}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowInvite(false); setInviteIds([]) }}
                    className="h-8 px-3 rounded-lg bg-card-bg border border-card-border text-brand text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Scores — not shown for Hammer, Skins, or Match (hole results card covers it) */}
      {!isHammer && !isSkins && !isMatch && (b.status === 'active' || b.status === 'settled') && (
        <div className="bg-card-bg border border-card-border rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Scores</h2>
          <div className="flex flex-col">
            {ranked.map((r) => {
              const sc = scores[r.id]
              const gross = sc ? sc.scores.reduce((s, h) => s + h.grossScore, 0) : null
              const net = sc ? sc.scores.reduce((s, h) => s + h.netScore, 0) : null
              const isWinner = b.winnersIds?.includes(r.id)
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2.5 border-b border-card-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {isWinner && <span className="text-xs">🏆</span>}
                    <span className={`text-sm font-medium ${isWinner ? 'text-blue-300' : 'text-brand'}`}>
                      {getName(r.id)}
                    </span>
                    <span className="text-xs text-muted">({r.holes}/18)</span>
                  </div>
                  <div className="flex gap-4">
                    {r.holes > 0 ? (
                      <>
                        <div className="text-center">
                          <p className="text-xs text-muted">Gross</p>
                          <p className={`text-sm font-bold ${isWinner && !useNet ? 'text-blue-300' : 'text-brand'}`}>{gross}</p>
                        </div>
                        {useNet && (
                          <div className="text-center">
                            <p className="text-xs text-muted">Net</p>
                            <p className={`text-sm font-bold ${isWinner ? 'text-blue-300' : 'text-blue-400'}`}>{net}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-muted">No scores</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hammer hole-by-hole breakdown */}
      {isHammer && b.hammerConfig && b.hammerConfig.holeResults.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">🔨 Hole Results</h2>
            <span className="text-xs text-white/70">{b.hammerConfig.holeResults.length}/18 holes</span>
          </div>
          <div className="divide-y divide-card-border">
            {Object.values(Object.fromEntries(b.hammerConfig.holeResults.map((r) => [r.hole, r])))
              .sort((a, z) => a.hole - z.hole)
              .map((r) => {
                const cfg = b.hammerConfig!
                const uid = currentUser!.uid
                const myHammerSide: 'A' | 'B' | null = cfg.sideA.includes(uid) ? 'A' : cfg.sideB.includes(uid) ? 'B' : null
                const sideANames = cfg.sideA.map(getName).join(' & ')
                const sideBNames = cfg.sideB.map(getName).join(' & ')
                const isFold = r.foldedBy !== null
                const winner = isFold
                  ? (r.foldedBy === 'A' ? sideBNames : sideANames)
                  : r.winningSide === 'A' ? sideANames
                  : r.winningSide === 'B' ? sideBNames
                  : null
                const resultLabel = isFold
                  ? `${r.foldedBy === 'A' ? sideANames : sideBNames} conceded`
                  : r.winningSide === 'tie' ? 'Tied'
                  : `${winner} won`

                // Determine winning side from viewer's perspective
                const winningSide = isFold
                  ? (r.foldedBy === 'A' ? 'B' : 'A')
                  : r.winningSide === 'tie' ? 'tie'
                  : r.winningSide
                const iWon = myHammerSide !== null && winningSide === myHammerSide
                const iLost = myHammerSide !== null && winningSide !== 'tie' && winningSide !== null && winningSide !== myHammerSide
                const resultColor = winningSide === 'tie' ? 'text-muted' : iWon ? 'text-green-600' : iLost ? 'text-danger' : 'text-muted'
                const amountColor = winningSide === 'tie' ? 'text-muted' : iWon ? 'text-green-600' : iLost ? 'text-danger' : 'text-brand'

                return (
                  <div key={r.hole} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="text-xs font-bold text-brand w-12 shrink-0">Hole {r.hole}</span>
                    <span className={`text-xs font-medium flex-1 ${resultColor}`}>
                      {resultLabel}
                      {r.hammersThrown > 0 && (
                        <span className="text-blue-600 ml-1">{'🔨'.repeat(Math.min(r.hammersThrown, 3))}</span>
                      )}
                    </span>
                    <span className={`text-xs font-bold shrink-0 ${amountColor}`}>${r.stake.toFixed(2)}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Skins hole-by-hole breakdown */}
      {isSkins && b.skinsResult && b.skinsResult.holeResults.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">⛳ Hole Results</h2>
            <span className="text-xs text-white/70">{b.skinsResult.holeResults.length}/18 holes</span>
          </div>
          <div className="divide-y divide-card-border">
            {b.skinsResult.holeResults
              .slice()
              .sort((a, z) => a.hole - z.hole)
              .map((r) => {
                const isWinner = r.winnerId === currentUser!.uid
                const isLoser = !isWinner && r.winnerId !== null
                const resultLabel = r.winnerId === null
                  ? 'Wash'
                  : `${getName(r.winnerId)} won`
                const resultColor = r.winnerId === null ? 'text-muted'
                  : isWinner ? 'text-green-600'
                  : isLoser ? 'text-danger'
                  : 'text-brand'
                const amountColor = r.winnerId === null ? 'text-muted'
                  : isWinner ? 'text-green-600'
                  : isLoser ? 'text-danger'
                  : 'text-brand'
                return (
                  <div key={r.hole} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="text-xs font-bold text-brand w-12 shrink-0">Hole {r.hole}</span>
                    <span className={`text-xs font-medium flex-1 ${resultColor}`}>{resultLabel}</span>
                    {r.score != null && (
                      <span className="text-xs text-muted shrink-0">{r.score}</span>
                    )}
                    <span className={`text-xs font-bold shrink-0 ${amountColor}`}>
                      {r.winnerId === null ? '—' : `$${b.skinsResult!.payoutPerSkin.toFixed(2)}`}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Match Play hole-by-hole breakdown — computed live from scores */}
      {isMatch && b.matchPlayers && (() => {
        const mp = b.matchPlayers!
        const { holeByHole } = computeMatchScore(mp.sideA, mp.sideB, scores, useNet)
        if (holeByHole.length === 0) return null
        const myHammerSide: 'A' | 'B' | null = mp.sideA.includes(uid) ? 'A' : mp.sideB.includes(uid) ? 'B' : null
        const sideANames = mp.sideA.map(getName).join(' & ')
        const sideBNames = mp.sideB.map(getName).join(' & ')
        return (
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
            <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">🏌️ Hole Results</h2>
              <span className="text-xs text-white/70">{holeByHole.length}/18 holes</span>
            </div>
            <div className="divide-y divide-card-border">
              {holeByHole.map((r) => {
                const iWon = myHammerSide !== null && r.winner === myHammerSide
                const iLost = myHammerSide !== null && r.winner !== 'tie' && r.winner !== myHammerSide
                const resultLabel = r.winner === 'tie' ? 'Halved'
                  : r.winner === 'A' ? `${sideANames} won`
                  : `${sideBNames} won`
                const resultColor = r.winner === 'tie' ? 'text-muted'
                  : iWon ? 'text-green-600'
                  : iLost ? 'text-danger'
                  : 'text-brand'
                return (
                  <div key={r.hole} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="text-xs font-bold text-brand w-12 shrink-0">Hole {r.hole}</span>
                    <span className={`text-xs font-medium flex-1 ${resultColor}`}>{resultLabel}</span>
                    <span className="text-xs text-muted shrink-0">{r.aScore} – {r.bScore}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Standing */}
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <div className="bg-blue-600 px-4 py-2.5">
          <h2 className="text-sm font-bold text-white">Bet Status</h2>
        </div>
        <div className="p-4 flex flex-col gap-2">
          {standingBlock()}
        </div>
      </div>

      {/* Pending join requests — visible to participants */}
      {pendingRequests.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Join Requests</h2>
          {pendingRequests.map((reqUid) => (
            <div key={reqUid} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-brand">{getName(reqUid)}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleApproveRequest(reqUid)}
                  className="px-3 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleDenyRequest(reqUid)}
                  className="px-3 h-8 rounded-lg bg-card-bg border border-card-border hover:border-red-500/50 text-brand text-xs font-semibold transition-colors"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      {/* My status indicators */}
      {hasRequested && !isParticipant && (
        <p className="text-sm text-yellow-400 text-center">Your join request is pending approval.</p>
      )}

      {/* Actions */}
      {(canAccept || canDecline || canCancel) && (
        <div className="flex gap-3">
          {canAccept && (
            <button
              type="button"
              onClick={handleAccept}
              className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              Accept Invite
            </button>
          )}
          {canDecline && (
            <button
              type="button"
              onClick={handleDecline}
              className="flex-1 h-9 rounded-xl bg-danger hover:bg-danger-hover text-white text-sm font-semibold transition-colors"
            >
              Decline
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-9 rounded-xl bg-danger hover:bg-danger-hover text-white text-sm font-semibold transition-colors"
            >
              Cancel Bet
            </button>
          )}
        </div>
      )}
    </div>
  )
}
