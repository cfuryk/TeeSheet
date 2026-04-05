import { useState, useEffect } from 'react'
import { roundService } from '@/services/roundService'
import type { Round } from '@/types'

/** Returns the single active round the user is currently participating in, if any. */
export function useActiveRound(uid: string | undefined) {
  const [activeRound, setActiveRound] = useState<Round | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setActiveRound(null)
      setLoading(false)
      return
    }
    const unsub = roundService.onRoundsByMemberSnapshot(uid, (rounds) => {
      const active = rounds.find((r) => r.status === 'active') ?? null
      setActiveRound(active)
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { activeRound, loading }
}
