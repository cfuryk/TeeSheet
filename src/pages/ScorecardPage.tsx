import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useScore } from '@/hooks/useScore'
import { useAuth } from '@/hooks/useAuth'
import { scoreService } from '@/services/scoreService'
import { HoleInfo } from '@/components/scorecard/HoleInfo'
import { HoleNavigation } from '@/components/scorecard/HoleNavigation'
import { GroupScoreSummary } from '@/components/scorecard/GroupScoreSummary'
import { ScorecardHeader } from '@/components/scorecard/ScorecardHeader'
import { ScorecardGrid } from '@/components/scorecard/ScorecardGrid'
import { RoundChat } from '@/components/scorecard/RoundChat'
import { Button, Spinner } from '@/components/ui'

export function ScorecardPage() {
  const { roundId, groupId } = useParams<{ roundId: string; groupId: string }>()
  const { ctx, loading } = useScore(roundId!, groupId!)
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const [currentHole, setCurrentHole] = useState(1)
  const [holeInitialised, setHoleInitialised] = useState(false)

  // Jump to first unscored hole once scores load
  useEffect(() => {
    if (holeInitialised || loading || !ctx) return
    const score = ctx.round.scoringFormat === 'scramble'
      ? ctx.scores.find((sc) => sc.golferId === (ctx.group?.groupAdminId ?? ctx.group?.golferIds[0]))
      : ctx.scores.find((sc) => sc.golferId === currentUser?.uid)
    if (score) {
      const scored = new Set(score.scores.map((s) => s.hole))
      const firstEmpty = Array.from({ length: 18 }, (_, i) => i + 1).find((h) => !scored.has(h))
      if (firstEmpty) setCurrentHole(firstEmpty)
    }
    setHoleInitialised(true)
  }, [loading, ctx, holeInitialised, currentUser?.uid])

  if (loading || !ctx) return <div className="flex justify-center py-12"><Spinner /></div>

  const { round, group, scores, tee } = ctx
  const isScramble = round.scoringFormat === 'scramble'
  const scrambleAdminId = group?.groupAdminId ?? group?.golferIds[0]
  const isScrambleAdmin = isScramble && currentUser?.uid === scrambleAdminId
  const chatDisplayName = userProfile?.displayName ?? currentUser?.displayName ?? 'Player'

  const myScore = isScramble
    ? scores.find((sc) => sc.golferId === scrambleAdminId)
    : scores.find((sc) => sc.golferId === currentUser?.uid)

  const holeData = tee.holes.find((h) => h.number === currentHole)!
  const holeIndex = currentHole - 1
  const myStrokes = myScore?.strokeAllocation[holeIndex] ?? 0
  const myHoleScore = myScore?.scores.find((s) => s.hole === currentHole)
  const isNetRound = round.roundType.includes('NET')
  const allHolesScored = scores.length > 0 && scores.every((s) => s.scores.length === 18)

  const nav = (
    <HoleNavigation
      currentHole={currentHole}
      totalHoles={18}
      onPrev={() => setCurrentHole((h) => Math.max(1, h - 1))}
      onNext={() => setCurrentHole((h) => Math.min(18, h + 1))}
    />
  )

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
        <HoleInfo hole={holeData} currentScore={null} onSelect={() => {}} navigation={nav} />
        {myScore && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Group Score</p>
            <ScorecardGrid scores={[myScore]} holes={tee.holes} isNet={false} />
          </div>
        )}
        <RoundChat roundId={roundId!} uid={currentUser!.uid} displayName={chatDisplayName} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ScorecardHeader round={round} currentHole={currentHole} totalHoles={18} />
      <HoleInfo
        hole={holeData}
        currentScore={myHoleScore?.grossScore ?? null}
        onSelect={handleScoreSelect}
        strokes={isNetRound && myScore && !isScramble ? myStrokes : 0}
        navigation={nav}
      />
      {allHolesScored && (
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate(`/rounds/${roundId}/groups/${groupId}/sign`)}
          className="w-full"
        >
          End Round & Sign
        </Button>
      )}
      <RoundChat roundId={roundId!} uid={currentUser!.uid} displayName={chatDisplayName} />
      {!isScramble && (
        <GroupScoreSummary scores={scores} holes={tee.holes} isNet={isNetRound} currentHole={currentHole} />
      )}
      {!isScramble && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/rounds/${roundId}/summary?from=scorecard&groupId=${groupId}`)}
              className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-base transition-colors"
            >
              Leaderboard
            </button>
            <button
              type="button"
              onClick={() => navigate(`/rounds/${roundId}/scorecard/${currentUser!.uid}?from=scorecard&groupId=${groupId}`)}
              className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-base transition-colors"
            >
              View Scorecard
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/rounds/${roundId}/side-bets?from=scorecard&groupId=${groupId}`)}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-colors"
          >
            Side Bets
          </button>
        </>
      )}
    </div>
  )
}
