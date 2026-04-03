import { useAuth } from '@/hooks/useAuth'
import { useMyEvents } from '@/hooks/useEvent'
import { EventCard } from '@/components/round/EventCard'
import { Spinner, Card } from '@/components/ui'

export function MyEventsPage() {
  const { currentUser } = useAuth()
  const { events, loading } = useMyEvents(currentUser?.uid ?? '')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">My Events</h1>

      {loading ? (
        <div className="flex items-center justify-center pt-8">
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-400">You haven't created any events yet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <EventCard key={e.eventId} event={e} currentUserId={currentUser?.uid} />
          ))}
        </div>
      )}
    </div>
  )
}
