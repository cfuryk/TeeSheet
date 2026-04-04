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
import { ScorecardGrid } from '@/components/scorecard/ScorecardGrid'
import { Button, Spinner } from '@/components/ui'

export function ScorecardPage() {
  const { roundId, groupId } = useParams<{ roundId: string; groupId: string }>()
  const { ctx, loading } = useScore(roundId!, groupId!)
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [currentHole, setCurrentHole] = useState(1)

  if (loading || !ctx) return <div className="flex justify-center py-12"><Spinner /></div>

  const { round, group, scores, tee } = ctx
  const isScramble = round.scoringFormat === 'scramble'
  const scrambleAdminId = group?.groupAdminId ?? group?.golferIds[0]
  const isScrambleAdmin = isScramble && currentUser?.uid === scrambleAdminId

  // For scramble: the single score doc is keyed to the admin
  const myScore = isScramble
    ? scores.find((sc) => sc.golferId === scrambleAdminId)
    : scores.find((sc) => sc.golferId === currentUser?.uid)

  const holeData = tee.holes.find((h) => h.number === currentHole)!
  const holeIndex = currentHole - 1
  const myStrokes = myScore?.strokeAllocation[holeIndex] ?? 0
  const myHoleScore = myScore?.scores.find((s) => s.hole === currentHole)
  const isNetRound = round.roundType.includes('NET')
  const allHolesScored = scores.length > 0 && scores.every((s) => s.scores.length === 18)

  async function handleScoreSelect(grossScore: number) {
    if (!myScore) return
    const netScore = grossScore - myStrokes
    await scoreService.updateHoleScore(
      roundId!,
      groupId!,
      myScore.golferId,
      { hole: currentHole, grossScore, netScore },
      myScore.scores,
    )
  }

  // Non-admin scramble member: read-only view
  if (isScramble && !isScrambleAdmin) {
    const adminName = myScore?.golferName ?? group?.name ?? 'Admin'
    return (
      <div className="flex flex-col gap-4">
        <ScorecardHeader round={round} currentHole={currentHole} totalHoles={18} />
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm mb-1">Scores are being entered by</p>
          <p className="text-white font-semibold">{adminName}</p>
        </div>
        <HoleInfo hole={holeData} />
        {myScore && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Group Score</p>
            <ScorecardGrid scores={[myScore]} holes={tee.holes} isNet={false} />
          </div>
        )}
        <HoleNavigation
          currentHole={currentHole}
          totalHoles={18}
          onPrev={() => setCurrentHole((h) => Math.max(1, h - 1))}
          onNext={() => setCurrentHole((h) => Math.min(18, h + 1))}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ScorecardHeader round={round} currentHole={currentHole} totalHoles={18} />
      <HoleInfo hole={holeData} />
      {isNetRound && myScore && !isScramble && (
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
      {!isScramble && (
        <GroupScoreSummary scores={scores} holes={tee.holes} isNet={isNetRound} currentHole={currentHole} />
      )}
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
