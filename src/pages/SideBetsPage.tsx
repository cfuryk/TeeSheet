import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRound } from '@/hooks/useRound'
import { useSideBets } from '@/hooks/useSideBets'
import { sideBetService } from '@/services/sideBetService'
import { userService } from '@/services/userService'
import { CreateSideBetModal } from '@/components/sideBets/CreateSideBetModal'
import { Spinner, Badge } from '@/components/ui'
import type { UserProfile, SideBet, SideBetType } from '@/types'

export const BET_TYPE_LABELS: Record<SideBetType, string> = {
  CHALLENGE_GROSS: 'Challenge Golfers (Gross)',
  CHALLENGE_NET: 'Challenge Golfers (Net)',
  CHALLENGE_TEAM_GROSS: 'Challenge Teams (Gross)',
  CHALLENGE_TEAM_NET: 'Challenge Teams (Net)',
  NASSAU_GROSS: 'Nassau (Gross)',
  NASSAU_NET: 'Nassau (Net)',
  SKINS: 'Skins',
}

export function SideBetsPage() {
  const { roundId } = useParams<{ roundId: string }>()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  const fromGroupId = searchParams.get('groupId')
  const { currentUser } = useAuth()
  const { round, loading: roundLoading } = useRound(roundId!)
  const { sideBets } = useSideBets(roundId!)
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!round?.memberIds?.length) return
    Promise.all(
      round.memberIds.map((uid) => userService.getProfile(uid).then((p) => ({ uid, p })))
    ).then((results) => {
      const map: Record<string, UserProfile> = {}
      for (const { uid, p } of results) {
        if (p) map[uid] = p
      }
      setProfiles(map)
    })
  }, [round])

  if (roundLoading || !round) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  const uid = currentUser!.uid
  const isScramble = round.scoringFormat === 'scramble'
  const members = (round.memberIds ?? []).map((id) => profiles[id]).filter(Boolean) as UserProfile[]
  const roundIsActive = round.status === 'active' || round.status === 'completed'

  const myBets = sideBets.filter(
    (b) => b.participantIds.includes(uid) || b.invitedIds.includes(uid)
  )

  function getName(id: string) {
    return profiles[id]?.displayName ?? id
  }

  async function handleJoin(bet: SideBet) {
    setActionError('')
    try {
      await sideBetService.joinBet(roundId!, bet.sideBetId, uid, bet.participantIds, bet.type)
    } catch {
      setActionError('Failed to join bet.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            from === 'scorecard' && fromGroupId
              ? navigate(`/rounds/${roundId}/groups/${fromGroupId}/scorecard`)
              : navigate(`/rounds/${roundId}`)
          }
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-colors"
        >
          {from === 'scorecard' ? 'Back to Score Entry' : 'Back to Round'}
        </button>
        {!isScramble && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-colors"
          >
            + New Side Bet
          </button>
        )}
      </div>

      <h1 className="text-2xl font-bold text-brand">Side Bets</h1>

      {isScramble && (
        <div className="bg-card-bg border border-card-border rounded-xl px-4 py-3">
          <p className="text-sm text-muted">Side bets are not available for scramble rounds.</p>
        </div>
      )}

      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      {!isScramble && (
        <>
          {/* My Side Bets */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">My Side Bets</h2>
            {myBets.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">You have no side bets in this round.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {myBets.map((bet) => (
                  <BetCard
                    key={bet.sideBetId}
                    bet={bet}
                    uid={uid}
                    roundId={roundId!}
                    roundIsActive={roundIsActive}
                    getName={getName}
                    onJoin={handleJoin}
                    navigate={navigate}
                    from={from}
                    fromGroupId={fromGroupId}
                  />
                ))}
              </div>
            )}
          </section>

          {/* All Side Bets */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">All Side Bets</h2>
            {sideBets.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">No side bets yet. Be the first to create one!</p>
            ) : (
              <div className="flex flex-col gap-3">
                {sideBets.map((bet) => (
                  <BetCard
                    key={bet.sideBetId}
                    bet={bet}
                    uid={uid}
                    roundId={roundId!}
                    roundIsActive={roundIsActive}
                    getName={getName}
                    onJoin={handleJoin}
                    navigate={navigate}
                    from={from}
                    fromGroupId={fromGroupId}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showCreate && (
        <CreateSideBetModal
          roundId={roundId!}
          round={round}
          members={members}
          currentUserId={uid}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}

// ─── Bet Card ────────────────────────────────────────────────────────────────

function BetCard({
  bet,
  uid,
  roundId,
  roundIsActive,
  getName,
  onJoin,
  navigate,
  from,
  fromGroupId,
}: {
  bet: SideBet
  uid: string
  roundId: string
  roundIsActive: boolean
  getName: (id: string) => string
  onJoin: (bet: SideBet) => void
  navigate: ReturnType<typeof useNavigate>
  from: string | null
  fromGroupId: string | null
}) {
  const isInvited = bet.invitedIds.includes(uid)
  const isParticipant = bet.participantIds.includes(uid)
  const canJoin = bet.isPublic && !isParticipant && !isInvited && bet.status === 'pending' && !roundIsActive

  const statusVariant = {
    pending: 'yellow',
    active: 'blue',
    settled: 'blue',
    cancelled: 'gray',
  } as const

  return (
    <button
      type="button"
      onClick={() => navigate(`/rounds/${roundId}/side-bets/${bet.sideBetId}${from === 'scorecard' && fromGroupId ? `?from=scorecard&groupId=${fromGroupId}` : ''}`)}
      className="w-full text-left bg-card-bg border border-card-border rounded-xl p-4 flex flex-col gap-3 hover:border-blue-600/50 transition-colors"
    >
      {/* Type + status row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-brand">{BET_TYPE_LABELS[bet.type]}</span>
          {bet.isPublic && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Public
            </span>
          )}
        </div>
        <Badge label={bet.status} variant={statusVariant[bet.status]} />
      </div>

      {/* Participant chips */}
      <div className="flex flex-wrap gap-1.5">
        {bet.participantIds.map((id) => (
          <span
            key={id}
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              bet.winnersIds?.includes(id)
                ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50'
                : 'bg-card-bg text-muted'
            }`}
          >
            {getName(id)}
          </span>
        ))}
        {bet.invitedIds.map((id) => (
          <span key={id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-card-bg/50 text-muted ring-1 ring-card-border">
            {getName(id)} <span className="text-muted">?</span>
          </span>
        ))}
      </div>

      {/* Wager */}
      <p className="text-sm text-muted">
        ${bet.wagerPerPerson.toFixed(2)} <span className="text-muted">/ person</span>
      </p>

      {/* Winner */}
      {bet.status === 'settled' && (
        <p className="text-sm font-semibold text-blue-400">
          {bet.winnersIds?.length === 0
            ? '🤝 Tie'
            : `🏆 ${bet.winnersIds?.map(getName).join(' / ')}`}
        </p>
      )}

      {/* Invited indicator */}
      {isInvited && (
        <p className="text-xs text-blue-400">You've been invited — tap to respond</p>
      )}

      {/* Join button for public bets */}
      {canJoin && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onJoin(bet) }}
          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          Join Bet
        </button>
      )}
    </button>
  )
}
