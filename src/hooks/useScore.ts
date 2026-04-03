import { useState, useEffect } from 'react'
import { scoreService } from '@/services/scoreService'
import { groupService } from '@/services/groupService'
import { roundService } from '@/services/roundService'
import { courseService } from '@/services/courseService'
import type { ActiveGroupContext, Score } from '@/types'

export function useScore(roundId: string, groupId: string) {
  const [ctx, setCtx] = useState<ActiveGroupContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roundId || !groupId) return

    let teeCache: ActiveGroupContext['tee'] | null = null

    const unsubRound = roundService.onRoundSnapshot(roundId, async (round) => {
      if (!round) return
      if (!teeCache) {
        const course = await courseService.getCourse(round.courseId)
        const tee = course?.tees.find((t) => t.teeId === round.teeId)
        if (!tee) return
        teeCache = tee
        setCtx((prev) => prev ? { ...prev, round } : null)
      } else {
        setCtx((prev) => prev ? { ...prev, round } : null)
      }
    })

    const unsubGroup = groupService.onGroupSnapshot(roundId, groupId, async (group) => {
      if (!group) return
      if (!teeCache) {
        const round = await roundService.getRound(roundId)
        if (round) {
          const course = await courseService.getCourse(round.courseId)
          const tee = course?.tees.find((t) => t.teeId === round.teeId)
          if (tee) {
            teeCache = tee
            setCtx((prev) =>
              prev ? { ...prev, group } : null
            )
          }
        }
      } else {
        setCtx((prev) => prev ? { ...prev, group } : null)
      }
    })

    const unsubScores = scoreService.onScoresSnapshot(roundId, groupId, (scores) => {
      setCtx((prev) => {
        if (prev) return { ...prev, scores }
        return null
      })
      // Bootstrap ctx once we have all pieces
      setCtx((prev) => {
        if (prev) return prev
        return null
      })
      setLoading(false)
    })

    // Bootstrap: fetch round + group once to initialize ctx
    Promise.all([
      roundService.getRound(roundId),
      groupService.getGroup(roundId, groupId),
    ]).then(async ([round, group]) => {
      if (!round || !group) return
      const course = await courseService.getCourse(round.courseId)
      const tee = course?.tees.find((t) => t.teeId === round.teeId)
      if (!tee) return
      teeCache = tee
      const scores = await scoreService.getAllScores(roundId, groupId)
      setCtx({ round, group, scores, tee })
      setLoading(false)
    })

    return () => {
      unsubRound()
      unsubGroup()
      unsubScores()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
