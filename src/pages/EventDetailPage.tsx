import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEvent } from '@/hooks/useEvent'
import { useRound } from '@/hooks/useRound'
import { RoundCard } from '@/components/round/RoundCard'
import { Spinner, Alert, Badge, Card, Button, Input } from '@/components/ui'
import { formatDate } from '@/lib/formatters'
import { useAuth } from '@/hooks/useAuth'
import { eventService } from '@/services/eventService'
import { userService } from '@/services/userService'
import type { UserProfile } from '@/types'
import { formatHandicap } from '@/lib/formatters'

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading } = useEvent(eventId!)
  const { currentUser } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!event) return <Alert message="Event not found." />

  const statusVariant = { upcoming: 'yellow', active: 'green', completed: 'gray' } as const
  const isCreator = event.createdBy === currentUser?.uid

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{event.name}</h1>
            {event.description && (
              <p className="text-gray-400 text-sm mt-0.5">{event.description}</p>
            )}
          </div>
          <Badge label={event.status} variant={statusVariant[event.status]} />
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-gray-500">{formatDate(event.date)}</span>
          <Badge label={event.type === 'single_round' ? 'Single Round' : 'Multi Round'} variant="gray" />
          {event.isPrivate && <Badge label="Private" variant="blue" />}
        </div>
      </div>

      {/* Participants & handicaps */}
      {event.memberIds.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Participants ({event.memberIds.length})
          </h2>
          <Card className="divide-y divide-gray-700">
            {event.memberIds.map((uid) => (
              <ParticipantRow
                key={uid}
                uid={uid}
                handicap={event.handicaps[uid] ?? 0}
                eventId={event.eventId}
                canEdit={isCreator && event.status === 'upcoming'}
              />
            ))}
          </Card>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Rounds ({event.roundIds.length})
          </h2>
          {isCreator && (
            <Link
              to="/rounds/new"
              className="text-sm font-semibold text-green-400 hover:text-green-300"
            >
              + Add Round
            </Link>
          )}
        </div>
        {event.roundIds.length === 0 ? (
          <Card className="p-4 text-center text-gray-500 text-sm">No rounds yet.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {event.roundIds.map((rid) => (
              <RoundDetailRow key={rid} roundId={rid} currentUserId={currentUser?.uid ?? ''} />
            ))}
          </div>
        )}
      </div>
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
