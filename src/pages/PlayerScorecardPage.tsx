import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  const { round, loading: roundLoading } = useRound(roundId!)
  const { groups, loading: groupsLoading } = useGroups(roundId!)
  const [score, setScore] = useState<Score | null>(null)
  const [partnerScore, setPartnerScore] = useState<Score | null>(null)
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
    // Find which group this golfer is in
    const group = groups.find((g) => g.golferIds.includes(golferId))
    if (!group) return

    scoreService.getAllScores(roundId!, group.groupId).then((scores) => {
      const mine = scores.find((s) => s.golferId === golferId) ?? null
      setScore(mine)

      // For best ball rounds, also load the partner's score
      const rt = round?.roundType
      if (rt === 'BEST_BALL_GROSS' || rt === 'BEST_BALL_NET') {
        const teamA = group.teams?.teamA ?? []
        const teamB = group.teams?.teamB ?? []
        const myTeam = teamA.includes(golferId) ? teamA : teamB.includes(golferId) ? teamB : []
        const partnerId = myTeam.find((id) => id !== golferId)
        if (partnerId) {
          const partner = scores.find((s) => s.golferId === partnerId) ?? null
          setPartnerScore(partner)
        }
      } else if (rt?.startsWith('TWO_TEAM_BB')) {
        const assignments = round?.teamAssignments ?? {}
        const myTeam = assignments[golferId]
        const partnerId = group.golferIds.find(
          (id) => id !== golferId && assignments[id] === myTeam
        )
        if (partnerId) {
          const partner = scores.find((s) => s.golferId === partnerId) ?? null
          setPartnerScore(partner)
        }
      }
    })
  }, [groups, golferId, roundId, round])

  if (roundLoading || groupsLoading || !tee || !score) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  const useNet = round!.roundType.includes('NET')
  const isBestBall = round!.roundType.includes('BEST_BALL') || round!.roundType.includes('BB')
  const displayScores = partnerScore ? [score, partnerScore] : [score]
  const title = partnerScore
    ? `${score.golferName} / ${partnerScore.golferName}`
    : score.golferName

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => navigate(`/rounds/${roundId}/summary`)}>
        Back to Leaderboard
      </Button>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <ScorecardGrid scores={displayScores} holes={tee.holes} isNet={useNet} showBestBall={isBestBall && !!partnerScore} />
    </div>
  )
}
