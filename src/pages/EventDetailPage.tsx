import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEvent } from '@/hooks/useEvent'
import { RoundCard } from '@/components/round/RoundCard'
import { Spinner, Alert, Card, Button, Input } from '@/components/ui'
import { formatHandicap } from '@/lib/formatters'
import { useAuth } from '@/hooks/useAuth'
import { eventService } from '@/services/eventService'
import { roundService } from '@/services/roundService'
import { userService } from '@/services/userService'
import type { Round, UserProfile } from '@/types'

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading } = useEvent(eventId!)
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [rounds, setRounds] = useState<Round[]>([])
  const [roundsLoading, setRoundsLoading] = useState(false)
  const [participantsOpen, setParticipantsOpen] = useState(false)

  useEffect(() => {
    if (!event || event.roundIds.length === 0) { setRounds([]); return }
    setRoundsLoading(true)
    Promise.all(event.roundIds.map((rid) => roundService.getRound(rid))).then((results) => {
      const loaded = results.filter(Boolean) as Round[]
      loaded.sort((a, b) => a.date.seconds - b.date.seconds)
      setRounds(loaded)
      setRoundsLoading(false)
    })
  }, [event?.roundIds.join(',')])

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!event) return <Alert message="Event not found." />

  const uid = currentUser!.uid
  const isMember = event.memberIds?.includes(uid)
  const isCreator = event.createdBy === uid

  const isAdmin = userProfile?.isAdmin ?? false
  if (event.isPrivate && !isMember && !isCreator) {
    return (
      <div className="flex flex-col items-center justify-center pt-16 gap-3">
        <p className="text-brand font-semibold">This event is private.</p>
        <p className="text-sm text-muted">You need an invitation to view this event.</p>
      </div>
    )
  }

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      await eventService.joinEvent(eventId!, uid)
    } catch {
      setError('Failed to join event.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert message={error} />}

      {/* Join button for public events */}
      {!isMember && !event.isPrivate && event.status !== 'completed' && (
        <Button loading={joining} onClick={handleJoin}>
          Join Event
        </Button>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          Rounds ({roundsLoading ? event.roundIds.length : rounds.length})
        </h2>
        {roundsLoading ? (
          <div className="flex flex-col gap-3">
            {event.roundIds.map((rid) => (
              <div key={rid} className="h-16 bg-card-bg rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rounds.length === 0 ? (
          <Card className="p-4 text-center text-muted text-sm">No rounds yet.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {rounds.map((round) => (
              <RoundCard key={round.roundId} round={round} currentUserId={uid} />
            ))}
          </div>
        )}
        {isCreator && (
          <Link
            to={`/rounds/new/full?eventId=${event.eventId}`}
            className="mt-3 flex items-center justify-center w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-semibold transition-colors text-base"
          >
            + Add Round
          </Link>
        )}
      </div>

      {/* Participants & handicaps */}
      {event.memberIds?.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setParticipantsOpen((o) => !o)}
            className="w-full flex items-center justify-between mb-3"
          >
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
              Participants ({event.memberIds.length})
            </h2>
            <svg
              className={`w-4 h-4 text-muted transition-transform ${participantsOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {participantsOpen && (
            <Card className="divide-y divide-card-border">
              {event.memberIds.map((id) => (
                <ParticipantRow
                  key={id}
                  uid={id}
                  handicap={event.handicaps[id] ?? 0}
                  eventId={event.eventId}
                  canEdit={isCreator && event.status === 'upcoming'}
                  canRemove={isAdmin && id !== uid}
                  showRemove={isAdmin}
                />
              ))}
            </Card>
          )}
        </div>
      )}

      {isCreator && (
        <button
          onClick={() => navigate(`/invite-golfers?targetType=event&targetId=${event.eventId}`)}
          className="flex items-center justify-center w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-semibold transition-colors text-base"
        >
          + Invite Participants
        </button>
      )}
    </div>
  )
}

function ParticipantRow({
  uid,
  handicap,
  eventId,
  canEdit,
  canRemove,
  showRemove,
}: {
  uid: string
  handicap: number
  eventId: string
  canEdit: boolean
  canRemove: boolean
  showRemove: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(handicap))
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    userService.getProfile(uid).then(setProfile)
  }, [uid])

  async function handleSave() {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) return
    setSaving(true)
    await eventService.updateParticipantHandicap(eventId, uid, parsed)
    setSaving(false)
    setEditing(false)
  }

  async function handleRemove() {
    setRemoving(true)
    await eventService.removeParticipant(eventId, uid)
    setRemoving(false)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-brand">{profile?.displayName ?? '…'}</span>
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <Input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-20 py-1 text-sm"
            />
            <Button size="sm" loading={saving} onClick={handleSave}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <>
            <span className="text-sm text-brand">HCP {formatHandicap(handicap)}</span>
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
            )}
            {(canRemove || showRemove) && (
              <button
                onClick={canRemove ? handleRemove : undefined}
                disabled={!canRemove || removing}
                className="w-7 h-7 rounded-full bg-danger hover:bg-danger-hover disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
