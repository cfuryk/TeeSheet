import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useScore } from '@/hooks/useScore'
import { useAuth } from '@/hooks/useAuth'
import { scoreService } from '@/services/scoreService'
import { HoleInfo } from '@/components/scorecard/HoleInfo'
import { ScoreSelector } from '@/components/scorecard/ScoreSelector'
import { StrokeIndicator } from '@/components/scorecard/StrokeIndicator'
import { HoleNavigation } from '@/components/scorecard/HoleNavigation'
import { GroupScoreSummary } from '@/components/scorecard/GroupScoreSummary'
import { ScorecardHeader } from '@/components/scorecard/ScorecardHeader'
import { Button, Spinner } from '@/components/ui'

export function ScorecardPage() {
  const { roundId, groupId } = useParams<{ roundId: string; groupId: string }>()
  const { ctx, loading } = useScore(roundId!, groupId!)
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [currentHole, setCurrentHole] = useState(1)

  if (loading || !ctx) return <div className="flex justify-center py-12"><Spinner /></div>

  const { round, scores, tee } = ctx
  const myScore = scores.find((sc) => sc.golferId === currentUser?.uid)
  const holeData = tee.holes.find((h) => h.number === currentHole)!
  const holeIndex = currentHole - 1
  const myStrokes = myScore?.strokeAllocation[holeIndex] ?? 0
  const myHoleScore = myScore?.scores.find((s) => s.hole === currentHole)
  const isNetRound = round.roundType === 'STROKE_NET' || round.roundType === 'BEST_BALL_NET'
  const allHolesScored = scores.length > 0 && scores.every((s) => s.scores.length === 18)

  async function handleScoreSelect(grossScore: number) {
    if (!currentUser || !myScore) return
    const netScore = grossScore - myStrokes
    await scoreService.updateHoleScore(
      roundId!,
      groupId!,
      currentUser.uid,
      { hole: currentHole, grossScore, netScore },
      myScore.scores,
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ScorecardHeader round={round} currentHole={currentHole} totalHoles={18} />
      <HoleInfo hole={holeData} />
      {isNetRound && myScore && (
        <StrokeIndicator strokes={myStrokes} courseHandicap={myScore.courseHandicap} />
      )}
      <ScoreSelector
        par={holeData.par}
        currentScore={myHoleScore?.grossScore ?? null}
        onSelect={handleScoreSelect}
      />
      <HoleNavigation
        currentHole={currentHole}
        totalHoles={18}
        onPrev={() => setCurrentHole((h) => Math.max(1, h - 1))}
        onNext={() => setCurrentHole((h) => Math.min(18, h + 1))}
      />
      <GroupScoreSummary scores={scores} holes={tee.holes} isNet={isNetRound} />
      {allHolesScored && (
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate(`/rounds/${roundId}/groups/${groupId}/sign`)}
          className="w-full mt-2"
        >
          End Round & Sign
        </Button>
      )}
    </div>
  )
}
