import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useScore } from '@/hooks/useScore'
import { useAuth } from '@/hooks/useAuth'
import { scoreService } from '@/services/scoreService'
import { roundService } from '@/services/roundService'
import { golferScoreService } from '@/services/golferScoreService'
import { userService } from '@/services/userService'
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
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

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
  const isStandalone = !round.eventId
  const isCreator = round.createdBy === currentUser?.uid
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

  async function handleCancelRound() {
    setCancelling(true)
    try {
      const memberIds = round.memberIds ?? []
      await golferScoreService.deleteScoresByRound(round.roundId)
      await roundService.deleteRound(round.roundId)
      await Promise.all(memberIds.map((id) => userService.recalculateHandicap(id)))
      navigate('/')
    } catch {
      setCancelling(false)
      setConfirmCancel(false)
    }
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
        {round.eventId && (
          <RoundChat roundId={roundId!} uid={currentUser!.uid} displayName={chatDisplayName} />
        )}
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
      {round.eventId && (
        <RoundChat roundId={roundId!} uid={currentUser!.uid} displayName={chatDisplayName} />
      )}
      {!isScramble && (
        <GroupScoreSummary scores={scores} holes={tee.holes} isNet={isNetRound} currentHole={currentHole} />
      )}
      {!isScramble && (
        <div className="flex gap-2">
          {round.eventId && (
            <button
              type="button"
              onClick={() => navigate(`/rounds/${roundId}/summary?from=scorecard&groupId=${groupId}`)}
              className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-base transition-colors"
            >
              Leaderboard
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/rounds/${roundId}/scorecard/${currentUser!.uid}?from=scorecard&groupId=${groupId}`)}
            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-base transition-colors"
          >
            View Scorecard
          </button>
        </div>
      )}

      {/* Cancel Round — standalone rounds, creator only */}
      {isStandalone && isCreator && (
        confirmCancel ? (
          <div className="flex flex-col gap-2 rounded-xl border border-red-800 bg-red-900/20 p-4">
            <p className="text-sm text-red-300 text-center">Cancel this round? All scores will be deleted.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={cancelling}
                onClick={handleCancelRound}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Yes, cancel round
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmCancel(false)}
                className="flex-1"
              >
                Keep Playing
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmCancel(true)} className="w-full">
            Cancel Round
          </Button>
        )
      )}
    </div>
  )
}
