import { useState, useEffect } from 'react'
import { roundService } from '@/services/roundService'
import { eventService } from '@/services/eventService'
import type { Round, GolfEvent } from '@/types'

export function useTeeSheetCombined() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [events, setEvents] = useState<GolfEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let roundsLoaded = false
    let eventsLoaded = false

    const checkDone = () => {
      if (roundsLoaded && eventsLoaded) setLoading(false)
    }

    const unsubRounds = roundService.onTeeSheetSnapshot((rs) => {
      setRounds(rs)
      roundsLoaded = true
      checkDone()
    })

    const unsubEvents = eventService.onTeeSheetEventsSnapshot((evts) => {
      setEvents(evts)
      eventsLoaded = true
      checkDone()
    })

    return () => {
      unsubRounds()
      unsubEvents()
    }
  }, [])

  return { rounds, events, loading }
}
