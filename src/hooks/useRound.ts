import { useState, useEffect } from 'react'
import { roundService } from '@/services/roundService'
import type { Round } from '@/types'

export function useRound(roundId: string) {
  const [round, setRound] = useState<Round | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = roundService.onRoundSnapshot(roundId, (r) => {
      setRound(r)
      setLoading(false)
    })
    return unsubscribe
  }, [roundId])

  return { round, loading }
}
