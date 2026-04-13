import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useScore } from '@/hooks/useScore'
import { useAuth } from '@/hooks/useAuth'
import { scoreService } from '@/services/scoreService'
import { groupService } from '@/services/groupService'
import { roundService } from '@/services/roundService'
import { golferScoreService } from '@/services/golferScoreService'
import { userService } from '@/services/userService'
import { HoleInfo } from '@/components/scorecard/HoleInfo'
import { HoleNavigation } from '@/components/scorecard/HoleNavigation'
import { GroupScoreSummary } from '@/components/scorecard/GroupScoreSummary'
import { ScorecardGrid } from '@/components/scorecard/ScorecardGrid'
import { RoundChat } from '@/components/scorecard/RoundChat'
import { Button, Spinner } from '@/components/ui'
import type { Score, Hole, Group } from '@/types'

// Fetch all scores across all groups in a round
function useRoundScores(roundId: string | undefined) {
  const [allScores, setAllScores] = useState<Score[]>([])

  useEffect(() => {
    if (!roundId) return
    // Listen to all groups, then collect their scores subcollections
    const unsub = onSnapshot(collection(db, 'rounds', roundId, 'groups'), (groupSnap) => {
      const groups = groupSnap.docs.map((d) => ({ groupId: d.id, ...d.data() } as Group))
      if (groups.length === 0) { setAllScores([]); return }

      const scoresByGroup: Record<string, Score[]> = {}
      const unsubScores: (() => void)[] = []

      groups.forEach((g) => {
        const unscore = onSnapshot(collection(db, 'rounds', roundId, 'groups', g.groupId, 'scores'), (snap) => {
          scoresByGroup[g.groupId] = snap.docs.map((d) => d.data() as Score)
          setAllScores(Object.values(scoresByGroup).flat())
        })
        unsubScores.push(unscore)
      })

      return () => unsubScores.forEach((u) => u())
    })
    return unsub
  }, [roundId])

  return allScores
}

function ScorecardGridCollapsible({ scores, holes, isNet }: { scores: Score[]; holes: Hole[]; isNet: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-brand">Scorecard</span>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-card-border p-4">
          <ScorecardGrid scores={scores} holes={holes} isNet={isNet} bare />
        </div>
      )}
    </div>
  )
}

export function ScorecardPage() {
  const { roundId, groupId } = useParams<{ roundId: string; groupId: string }>()
  const { ctx, loading } = useScore(roundId!, groupId!)
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const allRoundScores = useRoundScores(roundId)
  const [currentHole, setCurrentHole] = useState(1)
  const [holeInitialised, setHoleInitialised] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const startingRef = useRef(false)

  // Auto-start group if scores don't exist yet (navigated directly to scorecard)
  useEffect(() => {
    if (!ctx || startingRef.current) return
    if (ctx.group.status === 'pending' && ctx.scores.length === 0) {
      startingRef.current = true
      groupService.startGroup(roundId!, groupId!).catch(() => { startingRef.current = false })
    }
  }, [ctx, roundId, groupId])

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
  const isSoloRound = (round.memberIds?.length ?? 0) <= 1
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

  const myVsPar = myScore && myScore.scores.length > 0
    ? myScore.scores.reduce((sum, hs) => {
        const h = tee.holes.find((hole) => hole.number === hs.hole)
        return sum + (h ? hs.grossScore - h.par : 0)
      }, 0)
    : null

  const myTotalGross = myScore && myScore.scores.length > 0
    ? myScore.scores.reduce((sum, hs) => sum + hs.grossScore, 0)
    : null

  const myHolesScored = myScore?.scores.length ?? 0
  const allMyHolesScored = myHolesScored === 18
  const isMyScoreLocked = myScore?.isLocked ?? false

  const nav = (
    <HoleNavigation
      currentHole={currentHole}
      totalHoles={18}
      onPrev={() => setCurrentHole((h) => Math.max(1, h - 1))}
      onNext={() => setCurrentHole((h) => Math.min(18, h + 1))}
      allScored={allMyHolesScored && !isMyScoreLocked}
      onReview={() => navigate(`/rounds/${roundId}/groups/${groupId}/sign`)}
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
        <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
          <p className="text-muted text-sm mb-1">Scores are being entered by</p>
          <p className="text-brand font-semibold">{adminName}</p>
        </div>
        <HoleInfo hole={holeData} currentScore={null} onSelect={() => {}} navigation={nav} />
        {myScore && (
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-wide mb-3">Group Score</p>
            <ScorecardGrid scores={[myScore]} holes={tee.holes} isNet={false} bare />
          </div>
        )}
        {!isSoloRound && (
          <RoundChat roundId={roundId!} uid={currentUser!.uid} displayName={chatDisplayName} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {isMyScoreLocked ? (
        <div className="bg-green-600 rounded-xl px-4 py-8 flex flex-col items-center gap-4 text-center">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-white font-bold text-lg">Round Complete</p>
            <p className="text-white/70 text-sm mt-1">Your scorecard has been signed and locked.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/rounds/${roundId}/groups/${groupId}/sign`)}
            className="mt-2 px-6 py-2 rounded-lg bg-white text-brand font-semibold text-sm hover:bg-white/90 transition-colors"
          >
            View Signed Scorecard
          </button>
        </div>
      ) : (
        <HoleInfo
          hole={holeData}
          currentScore={myHoleScore?.grossScore ?? null}
          onSelect={handleScoreSelect}
          strokes={isNetRound && myScore && !isScramble ? myStrokes : 0}
          navigation={nav}
          golferName={myScore?.golferName}
          courseHandicap={myScore?.courseHandicap}
          vsPar={myVsPar}
          holesPlayed={myScore?.scores.length ?? 0}
          totalGross={myTotalGross}
          isLocked={isMyScoreLocked}
        />
      )}
      {!isSoloRound && (
        <RoundChat roundId={roundId!} uid={currentUser!.uid} displayName={chatDisplayName} />
      )}
      {!isScramble && (
        <GroupScoreSummary scores={allRoundScores} holes={tee.holes} isNet={isNetRound} roundId={roundId!} groupId={groupId!} />
      )}
      {!isScramble && scores.length > 0 && (
        <ScorecardGridCollapsible scores={scores} holes={tee.holes} isNet={isNetRound} />
      )}

      {/* Cancel Round — standalone rounds, creator only */}
      {isStandalone && isCreator && (
        confirmCancel ? (
          <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-danger text-center">Cancel this round? All scores will be deleted.</p>
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
                variant="primary"
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
