import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { eventService } from '@/services/eventService'
import { Spinner, Card, Button } from '@/components/ui'
import { EventCard } from '@/components/round/EventCard'
import type { GolfEvent } from '@/types'

export function AdminEventsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<GolfEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return eventService.onAllEventsSnapshot((e) => {
      setEvents(e)
      setLoading(false)
    })
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brand">Admin Events</h2>
        <Button variant="primary" size="sm" onClick={() => navigate('/admin')}>Back</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : events.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted">No events found.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <EventCard key={e.eventId} event={e} />
          ))}
        </div>
      )}
    </div>
  )
}
