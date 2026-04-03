import { useState, useEffect } from 'react'
import { groupService } from '@/services/groupService'
import type { Group } from '@/types'

export function useGroup(roundId: string, groupId: string) {
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roundId || !groupId) return
    const unsub = groupService.onGroupSnapshot(roundId, groupId, (g) => {
      setGroup(g)
      setLoading(false)
    })
    return unsub
  }, [roundId, groupId])

  return { group, loading }
}

export function useGroups(roundId: string) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roundId) return
    const unsub = groupService.onGroupsSnapshot(roundId, (gs) => {
      setGroups(gs)
      setLoading(false)
    })
    return unsub
  }, [roundId])

  return { groups, loading }
}
