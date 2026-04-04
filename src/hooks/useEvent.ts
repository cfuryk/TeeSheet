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

export function useMyEvents(uid: string) {
  const [events, setEvents] = useState<GolfEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }

    let created: GolfEvent[] = []
    let member: GolfEvent[] = []
    let createdLoaded = false
    let memberLoaded = false

    function merge() {
      const map = new Map<string, GolfEvent>()
      for (const e of [...created, ...member]) map.set(e.eventId, e)
      const merged = Array.from(map.values()).sort((a, b) => (b.date > a.date ? 1 : -1))
      setEvents(merged)
      if (createdLoaded && memberLoaded) setLoading(false)
    }

    const unsubCreated = eventService.onMyEventsSnapshot(uid, (evts) => {
      created = evts; createdLoaded = true; merge()
    })
    const unsubMember = eventService.onMemberEventsSnapshot(uid, (evts) => {
      member = evts; memberLoaded = true; merge()
    })

    return () => { unsubCreated(); unsubMember() }
  }, [uid])

  return { events, loading }
}
