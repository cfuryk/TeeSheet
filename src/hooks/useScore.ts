import { useState, useEffect, useRef } from 'react'
import { scoreService } from '@/services/scoreService'
import { groupService } from '@/services/groupService'
import { roundService } from '@/services/roundService'
import { courseService } from '@/services/courseService'
import type { ActiveGroupContext, Score } from '@/types'

export function useScore(roundId: string, groupId: string) {
  const [ctx, setCtx] = useState<ActiveGroupContext | null>(null)
  const [loading, setLoading] = useState(true)
  // Keep a ref so snapshot callbacks always see latest ctx without stale closure
  const ctxRef = useRef<ActiveGroupContext | null>(null)

  useEffect(() => {
    if (!roundId || !groupId) return

    let cancelled = false

    // Bootstrap: fetch everything once, then subscribe to live updates
    async function init() {
      const [round, group] = await Promise.all([
        roundService.getRound(roundId),
        groupService.getGroup(roundId, groupId),
      ])
      if (!round || !group || cancelled) return

      const course = await courseService.getCourse(round.courseId)
      const tee = course?.tees.find((t) => t.teeId === round.teeId)
      if (!tee || cancelled) return

      const scores = await scoreService.getAllScores(roundId, groupId)
      if (cancelled) return

      const initial: ActiveGroupContext = { round, group, scores, tee }
      ctxRef.current = initial
      setCtx(initial)
      setLoading(false)
    }

    init()

    // Live subscriptions — only update after bootstrap has set ctx
    const unsubRound = roundService.onRoundSnapshot(roundId, (round) => {
      if (!round || !ctxRef.current) return
      const next = { ...ctxRef.current, round }
      ctxRef.current = next
      setCtx(next)
    })

    const unsubGroup = groupService.onGroupSnapshot(roundId, groupId, (group) => {
      if (!group || !ctxRef.current) return
      const next = { ...ctxRef.current, group }
      ctxRef.current = next
      setCtx(next)
    })

    const unsubScores = scoreService.onScoresSnapshot(roundId, groupId, (scores) => {
      if (!ctxRef.current) return
      const next = { ...ctxRef.current, scores }
      ctxRef.current = next
      setCtx(next)
    })

    return () => {
      cancelled = true
      unsubRound()
      unsubGroup()
      unsubScores()
    }
  }, [roundId, groupId])

  return { ctx, loading }
}

export function useScores(roundId: string, groupId: string) {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roundId || !groupId) return
    const unsub = scoreService.onScoresSnapshot(roundId, groupId, (s) => {
      setScores(s)
      setLoading(false)
    })
    return unsub
  }, [roundId, groupId])

  return { scores, loading }
}
