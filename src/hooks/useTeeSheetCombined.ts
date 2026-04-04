import { useState, useEffect } from 'react'
import { roundService } from '@/services/roundService'
import { eventService } from '@/services/eventService'
import { useAuth } from '@/hooks/useAuth'
import type { Round, GolfEvent } from '@/types'

export function useTeeSheetCombined() {
  const { currentUser } = useAuth()
  const [rounds, setRounds] = useState<Round[]>([])
  const [publicEvents, setPublicEvents] = useState<GolfEvent[]>([])
  const [memberEvents, setMemberEvents] = useState<GolfEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let roundsLoaded = false
    let publicLoaded = false
    let memberLoaded = !currentUser // skip member query if not logged in

    const checkDone = () => {
      if (roundsLoaded && publicLoaded && memberLoaded) setLoading(false)
    }

    const unsubRounds = roundService.onTeeSheetSnapshot((rs) => {
      setRounds(rs)
      roundsLoaded = true
      checkDone()
    })

    const unsubPublic = eventService.onTeeSheetEventsSnapshot((evts) => {
      setPublicEvents(evts)
      publicLoaded = true
      checkDone()
    })

    let unsubMember = () => {}
    if (currentUser) {
      unsubMember = eventService.onMemberEventsSnapshot(currentUser.uid, (evts) => {
        // Only keep upcoming/active member events to match teesheet scope
        setMemberEvents(evts.filter((e) => e.status === 'upcoming' || e.status === 'active'))
        memberLoaded = true
        checkDone()
      })
    }

    return () => {
      unsubRounds()
      unsubPublic()
      unsubMember()
    }
  }, [currentUser])

  // Merge and deduplicate by eventId, sort by date asc
  const events = [...publicEvents, ...memberEvents]
    .filter((e, i, arr) => arr.findIndex((x) => x.eventId === e.eventId) === i)
    .sort((a, b) => a.date.toMillis() - b.date.toMillis())

  return { rounds, events, loading }
}
