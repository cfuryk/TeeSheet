import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRound } from '@/hooks/useRound'
import { useGroups } from '@/hooks/useGroup'
import { useSideBets } from '@/hooks/useSideBets'
import { sideBetService } from '@/services/sideBetService'
import { userService } from '@/services/userService'
import { CreateSideBetModal } from '@/components/sideBets/CreateSideBetModal'
import { Spinner } from '@/components/ui'
import type { UserProfile, SideBet, SideBetType } from '@/types'

export const BET_TYPE_LABELS: Record<SideBetType, string> = {
  STROKE_GROSS: 'Stroke (Gross)',
  STROKE_NET: 'Stroke (Net)',
  NASSAU_GROSS: 'Nassau (Gross)',
  NASSAU_NET: 'Nassau (Net)',
  MATCH_GROSS: 'Match (Gross)',
  MATCH_NET: 'Match (Net)',
  HAMMER: 'Hammer',
  SKINS_GROSS: 'Skins (Gross)',
  SKINS_NET: 'Skins (Net)',
}

export function SideBetsPage() {
  const { roundId } = useParams<{ roundId: string }>()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  const fromGroupId = searchParams.get('groupId')
  const { currentUser } = useAuth()
  const { round, loading: roundLoading } = useRound(roundId!)
  const { groups } = useGroups(roundId!)
  const { sideBets } = useSideBets(roundId!)
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [profilesLoaded, setProfilesLoaded] = useState(false)
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
      setProfilesLoaded(true)
    })
  }, [round])

  if (roundLoading || !round || !profilesLoaded) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  const uid = currentUser!.uid
  const isScramble = round.scoringFormat === 'scramble'
  const members = (round.memberIds ?? []).map((id) => profiles[id]).filter(Boolean) as UserProfile[]
  const roundIsActive = round.status === 'active' || round.status === 'completed'

  // Group members for the current group context (used for Hammer bet)
  const currentGroup = fromGroupId ? groups.find((g) => g.groupId === fromGroupId) : null
  const groupMembers = currentGroup
    ? currentGroup.golferIds.map((id) => profiles[id]).filter(Boolean) as UserProfile[]
    : members

  function getName(id: string) {
    return profiles[id]?.displayName ?? id
  }

  async function handleRequestJoin(bet: SideBet) {
    setActionError('')
    try {
      await sideBetService.requestJoin(roundId!, bet.sideBetId, uid)
    } catch {
      setActionError('Failed to request to join bet.')
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
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          {from === 'scorecard' ? 'Back to Score Entry' : 'Back to Round'}
        </button>
        {!isScramble && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
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
          {sideBets.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">No side bets yet. Be the first to create one!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {[
                ...sideBets.filter((b) => b.participantIds.includes(uid) || b.invitedIds.includes(uid) || (b.requestIds ?? []).includes(uid)),
                ...sideBets.filter((b) => !b.participantIds.includes(uid) && !b.invitedIds.includes(uid) && !(b.requestIds ?? []).includes(uid)),
              ].map((bet) => (
                <BetCard
                  key={bet.sideBetId}
                  bet={bet}
                  uid={uid}
                  roundId={roundId!}
                  roundIsActive={roundIsActive}
                  getName={getName}
                  onRequestJoin={handleRequestJoin}
                  navigate={navigate}
                  from={from}
                  fromGroupId={fromGroupId}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateSideBetModal
          roundId={roundId!}
          round={round}
          members={members}
          groupMembers={groupMembers}
          groupId={fromGroupId ?? undefined}
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
  onRequestJoin,
  navigate,
  from,
  fromGroupId,
}: {
  bet: SideBet
  uid: string
  roundId: string
  roundIsActive: boolean
  getName: (id: string) => string
  onRequestJoin: (bet: SideBet) => void
  navigate: ReturnType<typeof useNavigate>
  from: string | null
  fromGroupId: string | null
}) {
  const isInvited = bet.invitedIds.includes(uid)
  const isParticipant = bet.participantIds.includes(uid)
  const hasRequested = (bet.requestIds ?? []).includes(uid)
  const canRequestJoin = !isParticipant && !isInvited && !hasRequested && bet.status === 'pending' && !roundIsActive

  const statusBadgeClass = {
    pending:   'bg-yellow-500/10 text-yellow-700 ring-1 ring-yellow-500/30',
    active:    'bg-blue-600/10 text-blue-600 ring-1 ring-blue-600/30',
    settled:   'bg-green-600/10 text-green-700 ring-1 ring-green-600/30',
    cancelled: 'bg-red-500/10 text-danger ring-1 ring-red-500/30',
  } as const

  return (
    <button
      type="button"
      onClick={() => navigate(`/rounds/${roundId}/side-bets/${bet.sideBetId}${from === 'scorecard' && fromGroupId ? `?from=scorecard&groupId=${fromGroupId}` : ''}`)}
      className="w-full text-left bg-card-bg border border-card-border rounded-xl p-4 flex flex-col gap-3 hover:border-blue-600/50 transition-colors"
    >
      {/* Type + status badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-brand">{BET_TYPE_LABELS[bet.type] ?? bet.type}</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${statusBadgeClass[bet.status]}`}>
          {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
        </span>
      </div>

      {/* Participant chips — accepted first (green), invited/pending (gold), declined (red) */}
      <div className="flex flex-wrap gap-1.5">
        {bet.participantIds.map((id) => (
          <span key={id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-600/10 text-green-700 ring-1 ring-green-600/30">
            {getName(id)}
          </span>
        ))}
        {bet.invitedIds.map((id) => (
          <span key={id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-700 ring-1 ring-yellow-500/30">
            {getName(id)}
          </span>
        ))}
        {bet.declinedIds.map((id) => (
          <span key={id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-danger ring-1 ring-red-500/30">
            {getName(id)}
          </span>
        ))}
      </div>

      {/* Wager + accepted badge */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          ${bet.wagerPerPerson.toFixed(2)} / person
        </p>
        {isParticipant && (
          <span className="text-xs font-semibold text-green-700 bg-green-600/10 rounded-full px-2 py-0.5 ring-1 ring-green-600/30">
            {bet.createdBy === uid ? 'Initiated' : 'Accepted'}
          </span>
        )}
      </div>

      {/* Winner */}
      {bet.status === 'settled' && (
        <p className="text-sm font-semibold text-blue-400">
          {bet.winnersIds?.length === 0
            ? 'Tie'
            : `${bet.winnersIds?.map(getName).join(' / ')}`}
        </p>
      )}

      {/* Invited indicator */}
      {isInvited && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-blue-600">You've been invited — tap to respond</p>
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-600 text-white shrink-0">Invited</span>
        </div>
      )}

      {/* Pending request indicator */}
      {hasRequested && (
        <p className="text-xs text-yellow-400">Join request pending approval</p>
      )}

      {/* Request to join button */}
      {canRequestJoin && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRequestJoin(bet) }}
          className="w-full h-9 rounded-lg bg-card-bg border border-card-border hover:border-blue-600/50 text-brand text-sm font-semibold transition-colors"
        >
          Request to Join
        </button>
      )}
    </button>
  )
}
