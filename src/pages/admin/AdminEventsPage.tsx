import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { eventService } from '@/services/eventService'
import { Spinner, Card, Button, Badge } from '@/components/ui'
import { formatDate } from '@/lib/formatters'
import type { GolfEvent } from '@/types'

const statusVariant = { upcoming: 'yellow', active: 'green', completed: 'gray' } as const
const statusLabel = { upcoming: 'Upcoming', active: 'Active', completed: 'Completed' } as const

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
        <h2 className="text-xl font-bold text-white">Admin Events</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>Back</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : events.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-400">No events found.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <Link key={e.eventId} to={`/events/${e.eventId}`} className="block">
              <Card className="p-4 hover:border-gray-500 transition-colors">
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="font-semibold text-white truncate">{e.name}</p>
                    {e.description && <p className="text-sm text-gray-400 truncate">{e.description}</p>}
                  </div>
                  <Badge label={statusLabel[e.status]} variant={statusVariant[e.status]} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{formatDate(e.date)}</span>
                  <Badge label={e.type === 'single_round' ? 'Single Round' : 'Multi Round'} variant="gray" />
                  {e.isPrivate && <Badge label="Private" variant="blue" />}
                  <Badge label={`${e.memberIds?.length ?? 0} members`} variant="gray" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
