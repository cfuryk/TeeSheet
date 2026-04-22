import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useScore } from '@/hooks/useScore'
import { useGroups } from '@/hooks/useGroup'
import { useAuth } from '@/hooks/useAuth'
import { scoreService } from '@/services/scoreService'
import { groupService } from '@/services/groupService'
import { roundChatService } from '@/services/roundChatService'
import { buildScoringAlerts } from '@/lib/scoringAlerts'
import { HoleInfo } from '@/components/scorecard/HoleInfo'
import { HoleNavigation } from '@/components/scorecard/HoleNavigation'
import { GroupScoreSummary } from '@/components/scorecard/GroupScoreSummary'
import { MatchScoreSummary } from '@/components/scorecard/MatchScoreSummary'
import { ScrambleScoreSummary } from '@/components/scorecard/ScrambleScoreSummary'
import { ScorecardGrid } from '@/components/scorecard/ScorecardGrid'
import { RoundChat } from '@/components/scorecard/RoundChat'
import { ActiveBetsPanel } from '@/components/sideBets/ActiveBetsPanel'
import { TabBar, Spinner } from '@/components/ui'
import type { Score, Group, Hole } from '@/types'

type TabKey = 'scoring' | 'scorecard' | 'leaderboard' | 'bets'

function getInitialTab(): TabKey {
    try {
        const stored = localStorage.getItem('scorecard-tab') as TabKey | null
        return stored ?? 'scoring'
    } catch {
        return 'scoring'
    }
}

// Fetch all scores across all groups in a round
function useRoundScores(roundId: string | undefined) {
    const [allScores, setAllScores] = useState<Score[]>([])

    useEffect(() => {
        if (!roundId) return
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

export function ScorecardPage() {
    const { roundId, groupId } = useParams<{ roundId: string; groupId: string }>()
    const { ctx, loading } = useScore(roundId!, groupId!)
    const { groups: allGroups } = useGroups(roundId!)
    const { currentUser, userProfile } = useAuth()
    const navigate = useNavigate()
    const allRoundScores = useRoundScores(roundId)
    const [currentHole, setCurrentHole] = useState(1)
    const [holeInitialised, setHoleInitialised] = useState(false)
    const startingRef = useRef(false)
    const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab)
    // Snapshot of gross score for each hole at the time we navigated to it
    const holeSnapshotRef = useRef<Record<number, number | null>>({})
    // UID of the leaderboard leader at the last hole change — to detect leader changes
    const prevLeaderRef = useRef<string | null>(null)

    // Scramble lock state: 'claiming' while attempting, 'held' if we own it, 'blocked' if another player has it
    const [lockStatus, setLockStatus] = useState<'claiming' | 'held' | 'blocked'>('claiming')
    const lockHeldRef = useRef(false)

    function handleTabChange(tab: string) {
        setActiveTab(tab as TabKey)
        try { localStorage.setItem('scorecard-tab', tab) } catch { /* ignore */ }
    }

    // Auto-start group if scores don't exist yet
    useEffect(() => {
        if (!ctx || startingRef.current) return
        if (ctx.group.status === 'pending' && ctx.scores.length === 0) {
            startingRef.current = true
            groupService.startGroup(roundId!, groupId!).catch(() => { startingRef.current = false })
        }
    }, [ctx, roundId, groupId])

    // Scramble lock: claim on mount, release on unmount
    useEffect(() => {
        if (!ctx || ctx.round.scoringFormat !== 'scramble') return
        if (!currentUser?.uid) return

        const uid = currentUser.uid
        groupService.claimScorecardLock(roundId!, groupId!, uid).then((claimed) => {
            if (claimed) {
                lockHeldRef.current = true
                setLockStatus('held')
            } else {
                setLockStatus('blocked')
            }
        })

        return () => {
            if (lockHeldRef.current) {
                lockHeldRef.current = false
                groupService.releaseScorecardLock(roundId!, groupId!, uid)
            }
        }
    }, [ctx?.round.scoringFormat, roundId, groupId, currentUser?.uid])

    // Jump to first unscored hole once scores load
    useEffect(() => {
        if (holeInitialised || loading || !ctx) return
        const score = ctx.round.scoringFormat === 'scramble'
            ? ctx.scores[0]
            : ctx.scores.find((sc) => sc.golferId === currentUser?.uid)
        if (score) {
            const scored = new Set(score.scores.map((s) => s.hole))
            const firstEmpty = Array.from({ length: 18 }, (_, i) => i + 1).find((h) => !scored.has(h))
            if (firstEmpty) setCurrentHole(firstEmpty)
        }
        setHoleInitialised(true)
    }, [loading, ctx, holeInitialised, currentUser?.uid])

    // Snapshot each hole's existing score when we arrive on it (for alert diffing)
    useEffect(() => {
        if (!ctx) return
        const score = ctx.round.scoringFormat === 'scramble'
            ? ctx.scores[0]
            : ctx.scores.find((sc) => sc.golferId === currentUser?.uid)
        if (!score) return
        if (!(currentHole in holeSnapshotRef.current)) {
            holeSnapshotRef.current[currentHole] = score.scores.find((s) => s.hole === currentHole)?.grossScore ?? null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentHole, ctx?.scores.find?.(s => s.golferId === currentUser?.uid)?.golferId])

    if (loading || !ctx) return <div className="flex justify-center py-12"><Spinner /></div>

    const { round, group, scores, tee } = ctx
    const isScramble = round.scoringFormat === 'scramble'
    const isSoloRound = (round.memberIds?.length ?? 0) <= 1
    const chatDisplayName = userProfile?.displayName ?? currentUser?.displayName ?? 'Player'

    const scrambleScore = isScramble ? scores[0] : undefined

    const myScore = isScramble
        ? scrambleScore
        : scores.find((sc) => sc.golferId === currentUser?.uid)

    const holeData = tee.holes.find((h) => h.number === currentHole)!
    const holeIndex = currentHole - 1
    const myStrokes = myScore?.strokeAllocation[holeIndex] ?? 0
    const myHoleScore = myScore?.scores.find((s) => s.hole === currentHole)
    const isNetRound = round.roundType.includes('NET') || round.match?.scoring === 'NET'

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
            onPrev={() => handleHoleChange(Math.max(1, currentHole - 1))}
            onNext={() => handleHoleChange(Math.min(18, currentHole + 1))}
            allScored={allMyHolesScored && !isMyScoreLocked}
            onReview={() => navigate(`/rounds/${roundId}/groups/${groupId}/sign`)}
            strokes={isNetRound && myScore && !isScramble ? myStrokes : 0}
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

    function getSoleLeader(holes: Hole[], useNet: boolean): string | null {
        if (isScramble || round.match) return null
        const vsPar = (sc: Score) => sc.scores.reduce((sum, hs) => {
            const h = holes.find((hole) => hole.number === hs.hole)
            return sum + (h ? (useNet ? hs.netScore : hs.grossScore) - h.par : 0)
        }, 0)
        const withScores = allRoundScores.filter((s) => s.scores.length > 0)
        if (withScores.length === 0) return null
        const best = Math.min(...withScores.map(vsPar))
        const leaders = withScores.filter((s) => vsPar(s) === best)
        return leaders.length === 1 ? leaders[0].golferId : null
    }

    async function handleHoleChange(nextHole: number) {
        if (!isSoloRound && myScore && holeData) {
            const prevGross = holeSnapshotRef.current[currentHole] ?? null
            const currentGross = myScore.scores.find((s) => s.hole === currentHole)?.grossScore ?? null
            if (currentGross !== null && currentGross !== prevGross) {
                const newLeaderId = prevGross === null ? getSoleLeader(tee.holes, isNetRound) : null
                const leaderChanged = newLeaderId !== null && newLeaderId !== prevLeaderRef.current
                if (leaderChanged) prevLeaderRef.current = newLeaderId
                const alerts = buildScoringAlerts({
                    playerName: myScore.golferName,
                    hole: currentHole,
                    par: holeData.par,
                    prevGross,
                    newGross: currentGross,
                    isNewLeader: leaderChanged && newLeaderId === myScore.golferId,
                })
                for (const alert of alerts) {
                    roundChatService.sendMessage(roundId!, currentUser!.uid, 'System', alert.text, true, alert.alertType)
                }
            }
        }
        holeSnapshotRef.current[nextHole] = myScore?.scores.find((s) => s.hole === nextHole)?.grossScore ?? null
        setCurrentHole(nextHole)
    }

    // Scramble: show spinner while claiming lock
    if (isScramble && lockStatus === 'claiming') {
        return <div className="flex justify-center py-12"><Spinner /></div>
    }

    // Scramble: blocked — another player holds the lock
    if (isScramble && lockStatus === 'blocked') {
        const lockedByName = group.scorecardLockedBy
            ? (allRoundScores.find((s) => s.golferId === group.scorecardLockedBy)?.golferName
                ?? userProfile?.displayName
                ?? 'a teammate')
            : 'a teammate'
        return (
            <div className="flex flex-col gap-4">
                <div className="bg-card-bg border border-card-border rounded-xl p-6 flex flex-col items-center gap-3 text-center">
                    <svg className="w-10 h-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <div>
                        <p className="text-brand font-bold text-base">Score entry is in progress</p>
                        <p className="text-muted text-sm mt-1">Scores are being entered by <span className="font-semibold text-brand">{lockedByName}</span></p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate(`/rounds/${roundId}/summary`)}
                        className="mt-2 w-full h-9 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold text-sm transition-colors"
                    >
                        View Leaderboard
                    </button>
                </div>
                {!isSoloRound && (
                    <RoundChat roundId={roundId!} uid={currentUser!.uid} displayName={chatDisplayName} />
                )}
            </div>
        )
    }

    // Build tab list
    const tabs = [
        { key: 'scoring', label: 'Scoring' },
        ...(!isScramble ? [{ key: 'scorecard', label: 'Card' }] : []),
        { key: 'leaderboard', label: 'Leaders' },
        ...(!isScramble && !isSoloRound ? [{ key: 'bets', label: 'Bets' }] : []),
    ]

    // If stored tab is not valid for this round type, fall back to scoring
    const validTab = tabs.some((t) => t.key === activeTab) ? activeTab : 'scoring'

    return (
        <div className="flex flex-col gap-0 -mt-4">
            <TabBar tabs={tabs} active={validTab} onChange={handleTabChange} />

            <div className="flex flex-col gap-4 pt-4">
                {/* Live Scoring tab */}
                {validTab === 'scoring' && (
                    <div className="flex flex-col gap-4 -mb-8" style={{ height: 'calc(100dvh - 8.25rem)', overflow: 'hidden' }}>
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
                                    className="mt-2 px-6 h-9 rounded-lg bg-white text-brand font-semibold text-sm hover:bg-white/90 transition-colors inline-flex items-center justify-center"
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
                                courseHandicap={isScramble ? undefined : myScore?.courseHandicap}
                                vsPar={myVsPar}
                                holesPlayed={myScore?.scores.length ?? 0}
                                totalGross={myTotalGross}
                                isLocked={isMyScoreLocked}
                            />
                        )}
                        {!isSoloRound && (
                            <RoundChat roundId={roundId!} uid={currentUser!.uid} displayName={chatDisplayName} className="flex-1" />
                        )}
                    </div>
                )}

                {/* Scorecard tab */}
                {validTab === 'scorecard' && !isScramble && scores.length > 0 && (
                    <ScorecardGrid scores={scores} holes={tee.holes} isNet={isNetRound} bare />
                )}
                {validTab === 'scorecard' && !isScramble && scores.length === 0 && (
                    <p className="text-muted text-sm text-center py-8">No scores yet.</p>
                )}

                {/* Leaderboard tab */}
                {validTab === 'leaderboard' && (
                    <>
                        {isScramble && (
                            <ScrambleScoreSummary
                                groups={allGroups}
                                allScores={allRoundScores}
                                holes={tee.holes}
                                roundId={roundId!}
                                groupId={groupId!}
                            />
                        )}
                        {!isScramble && round.match && (
                            <MatchScoreSummary
                                match={round.match}
                                groups={allGroups}
                                allScores={allRoundScores}
                                holes={tee.holes}
                                useNet={isNetRound}
                                roundId={roundId!}
                                groupId={groupId!}
                                currentUserId={currentUser!.uid}
                            />
                        )}
                        {!isScramble && !round.match && (
                            <GroupScoreSummary scores={allRoundScores} holes={tee.holes} isNet={isNetRound} roundId={roundId!} groupId={groupId!} />
                        )}
                    </>
                )}

                {/* Side Bets tab */}
                {validTab === 'bets' && !isScramble && !isSoloRound && (
                    <ActiveBetsPanel roundId={roundId!} uid={currentUser!.uid} groupId={groupId!} />
                )}
            </div>
        </div>
    )
}
