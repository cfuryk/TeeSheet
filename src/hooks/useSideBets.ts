import { useState, useEffect } from 'react'
import { sideBetService } from '@/services/sideBetService'
import type { SideBet } from '@/types'

export function useSideBets(roundId: string) {
  const [sideBets, setSideBets] = useState<SideBet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roundId) return
    const unsub = sideBetService.onSideBetsSnapshot(roundId, (bets) => {
      setSideBets(bets)
      setLoading(false)
    })
    return unsub
  }, [roundId])

  return { sideBets, loading }
}
