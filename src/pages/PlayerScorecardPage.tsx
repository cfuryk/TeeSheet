import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRound } from '@/hooks/useRound'
import { useGroups } from '@/hooks/useGroup'
import { courseService } from '@/services/courseService'
import { scoreService } from '@/services/scoreService'
import { ScorecardGrid } from '@/components/scorecard/ScorecardGrid'
import { Button, Spinner } from '@/components/ui'
import type { Score, Tee } from '@/types'

export function PlayerScorecardPage() {
  const { roundId, golferId } = useParams<{ roundId: string; golferId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  const groupId = searchParams.get('groupId')
  const { round, loading: roundLoading } = useRound(roundId!)
  const { groups, loading: groupsLoading } = useGroups(roundId!)
  const [groupScores, setGroupScores] = useState<Score[]>([])
  const [tee, setTee] = useState<Tee | null>(null)

  useEffect(() => {
    if (!round) return
    courseService.getCourse(round.courseId).then((c) => {
      const t = c?.tees.find((t) => t.teeId === round.teeId)
      if (t) setTee(t)
    })
  }, [round])

  useEffect(() => {
    if (groups.length === 0 || !golferId) return
    const group = groups.find((g) => g.golferIds.includes(golferId))
    if (!group) return
    scoreService.getAllScores(roundId!, group.groupId).then((scores) => {
      // Put the viewed golfer first, then the rest
      const mine = scores.find((s) => s.golferId === golferId)
      const others = scores.filter((s) => s.golferId !== golferId)
      setGroupScores(mine ? [mine, ...others] : others)
    })
  }, [groups, golferId, roundId])

  if (roundLoading || groupsLoading || !tee || groupScores.length === 0) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  const useNet = round!.roundType.includes('NET')
  const isBestBall = round!.roundType.includes('BEST_BALL') || round!.roundType.includes('BB')

  const backLabel = from === 'scorecard' ? 'Back to Score Entry' : 'Back to Leaderboard'
  function handleBack() {
    if (from === 'scorecard' && groupId) {
      navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`)
    } else if (from === 'scorecard') {
      navigate(-1)
    } else {
      navigate(`/rounds/${roundId}/summary`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={handleBack}>
        {backLabel}
      </Button>
      <h1 className="text-xl font-bold text-brand">{groupScores[0].golferName}</h1>
      <ScorecardGrid scores={groupScores} holes={tee.holes} isNet={useNet} showBestBall={isBestBall && groupScores.length > 1} />
    </div>
  )
}
