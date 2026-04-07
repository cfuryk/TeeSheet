import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEvent } from '@/hooks/useEvent'
import { useRound } from '@/hooks/useRound'
import { RoundCard } from '@/components/round/RoundCard'
import { Spinner, Alert, Badge, Card, Button, Input } from '@/components/ui'
import { InviteModal } from '@/components/event/InviteModal'
import { formatDate, formatHandicap } from '@/lib/formatters'
import { useAuth } from '@/hooks/useAuth'
import { eventService } from '@/services/eventService'
import { userService } from '@/services/userService'
import type { UserProfile } from '@/types'

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading } = useEvent(eventId!)
  const { currentUser } = useAuth()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [showInvite, setShowInvite] = useState(false)

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

  // Block access to private events for non-members/non-creators
  if (event.isPrivate && !isMember && !isCreator) {
    return (
      <div className="flex flex-col items-center justify-center pt-16 gap-3">
        <p className="text-white font-semibold">This event is private.</p>
        <p className="text-sm text-gray-400">You need an invitation to view this event.</p>
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

  const statusVariant = { upcoming: 'yellow', active: 'green', completed: 'gray' } as const

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert message={error} />}

      {showInvite && (
        <InviteModal
          targetType="event"
          targetId={event.eventId}
          createdBy={uid}
          targetName={event.name}
          onClose={() => setShowInvite(false)}
        />
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 mr-3">
            <h1 className="text-xl font-bold text-white">{event.name}</h1>
            {event.description && (
              <p className="text-gray-400 text-sm mt-0.5">{event.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge label={event.status} variant={statusVariant[event.status]} />
            <Badge label={isMember ? 'Joined' : 'Not joined'} variant={isMember ? 'green' : 'yellow'} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-gray-500">{formatDate(event.date)}</span>
          <Badge label={event.type === 'single_round' ? 'Single Round' : 'Multi Round'} variant="gray" />
          {event.isPrivate && <Badge label="Private" variant="purple" />}
        </div>
      </div>

      {/* Join button for public events */}
      {!isMember && !event.isPrivate && event.status !== 'completed' && (
        <Button loading={joining} onClick={handleJoin}>
          Join Event
        </Button>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Rounds ({event.roundIds.length})
        </h2>
        {event.roundIds.length === 0 ? (
          <Card className="p-4 text-center text-gray-500 text-sm">No rounds yet.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {event.roundIds.map((rid) => (
              <RoundDetailRow key={rid} roundId={rid} currentUserId={uid} />
            ))}
          </div>
        )}
        {isCreator && (
          <Link
            to="/rounds/new"
            className="mt-3 flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors text-base"
          >
            + Add Round
          </Link>
        )}
      </div>

      {/* Participants & handicaps */}
      {event.memberIds?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Participants ({event.memberIds.length})
          </h2>
          <Card className="divide-y divide-gray-700">
            {event.memberIds.map((id) => (
              <ParticipantRow
                key={id}
                uid={id}
                handicap={event.handicaps[id] ?? 0}
                eventId={event.eventId}
                canEdit={isCreator && event.status === 'upcoming'}
              />
            ))}
          </Card>
        </div>
      )}

      {isCreator && (
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors text-base"
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
}: {
  uid: string
  handicap: number
  eventId: string
  canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(handicap))
  const [saving, setSaving] = useState(false)
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

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-white">{profile?.displayName ?? '…'}</span>
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
            <span className="text-sm text-white">HCP {formatHandicap(handicap)}</span>
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function RoundDetailRow({ roundId, currentUserId }: { roundId: string; currentUserId: string }) {
  const { round, loading } = useRound(roundId)
  if (loading) return <div className="h-16 bg-gray-800 rounded-xl animate-pulse" />
  if (!round) return null
  return <RoundCard round={round} currentUserId={currentUserId} />
}
