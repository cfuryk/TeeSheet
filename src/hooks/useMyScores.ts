import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { golferScoreService } from '@/services/golferScoreService'
import type { GolferScore } from '@/types'

export function useMyScores() {
  const { currentUser } = useAuth()
  const [scores, setScores] = useState<GolferScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      setScores([])
      setLoading(false)
      return
    }
    const unsub = golferScoreService.onMyScoresSnapshot(currentUser.uid, (s) => {
      setScores(s)
      setLoading(false)
    })
    return unsub
  }, [currentUser])

  return { scores, loading }
}
