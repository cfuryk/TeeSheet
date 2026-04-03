import { useState, useEffect } from 'react'
import { roundService } from '@/services/roundService'
import type { Round } from '@/types'

export function useMyRounds(uid: string) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }

    let memberRounds: Round[] = []
    let createdRounds: Round[] = []
    let memberLoaded = false
    let createdLoaded = false

    function merge() {
      const map = new Map<string, Round>()
      for (const r of [...memberRounds, ...createdRounds]) {
        map.set(r.roundId, r)
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => (b.date > a.date ? 1 : -1),
      )
      setRounds(merged)
      if (memberLoaded && createdLoaded) setLoading(false)
    }

    const unsubMember = roundService.onRoundsByMemberSnapshot(uid, (rs) => {
      memberRounds = rs
      memberLoaded = true
      merge()
    })

    const unsubCreated = roundService.onRoundsByCreatorSnapshot(uid, (rs) => {
      createdRounds = rs
      createdLoaded = true
      merge()
    })

    return () => {
      unsubMember()
      unsubCreated()
    }
  }, [uid])

  return { rounds, loading }
}
