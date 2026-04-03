import { useState, useEffect } from 'react'
import { eventService } from '@/services/eventService'
import type { GolfEvent } from '@/types'

export function useEvent(eventId: string) {
  const [event, setEvent] = useState<GolfEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    const unsub = eventService.onEventSnapshot(eventId, (e) => {
      setEvent(e)
      setLoading(false)
    })
    return unsub
  }, [eventId])

  return { event, loading }
}

export function useMyEvents(createdBy: string) {
  const [events, setEvents] = useState<GolfEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!createdBy) return
    const unsub = eventService.onMyEventsSnapshot(createdBy, (evts) => {
      setEvents(evts)
      setLoading(false)
    })
    return unsub
  }, [createdBy])

  return { events, loading }
}
