import { Link } from 'react-router-dom'
import type { GolfEvent } from '@/types'
import { Card, Badge } from '@/components/ui'
import { formatDate } from '@/lib/formatters'

interface Props {
  event: GolfEvent
  currentUserId?: string
}

const statusVariant: Record<GolfEvent['status'], 'yellow' | 'green' | 'gray'> = {
  upcoming: 'yellow',
  active: 'green',
  completed: 'gray',
}

export function EventCard({ event, currentUserId: _currentUserId }: Props) {
  return (
    <Link to={`/events/${event.eventId}`} className="block">
      <Card className="p-4 hover:border-gray-500 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1 mr-3">
            <p className="font-semibold text-white truncate">{event.name}</p>
            {event.description && (
              <p className="text-sm text-gray-400 mt-0.5 truncate">{event.description}</p>
            )}
          </div>
          <Badge label={event.status} variant={statusVariant[event.status]} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatDate(event.date)}</span>
          <Badge label={event.type === 'single_round' ? 'Single Round' : 'Multi Round'} variant="gray" />
          {event.isPrivate && <Badge label="Private" variant="blue" />}
        </div>
      </Card>
    </Link>
  )
}
