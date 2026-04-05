import { useState, useEffect } from 'react'
import { sideBetService } from '@/services/sideBetService'
import type { SideBet } from '@/types'

export function useMyBets(uid: string) {
  const [bets, setBets] = useState<SideBet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const unsub = sideBetService.onUserBetsSnapshot(uid, (b) => {
      setBets(b)
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { bets, loading }
}
