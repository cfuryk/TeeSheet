import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import { useRound } from '@/hooks/useRound'
import { useGroups } from '@/hooks/useGroup'
import { useSideBets } from '@/hooks/useSideBets'
import { groupService } from '@/services/groupService'
import { roundService } from '@/services/roundService'
import { scoreService } from '@/services/scoreService'
import { golferScoreService } from '@/services/golferScoreService'
import { courseService } from '@/services/courseService'
import { eventService } from '@/services/eventService'
import { GroupCard } from '@/components/round/GroupCard'
import { RoundCard } from '@/components/round/RoundCard'
import { ManageGroupsModal } from '@/components/round/ManageGroupsModal'
import { Button, Spinner, Alert } from '@/components/ui'
import {
    matchPlayPoints,
    twoTeamAggregateScore,
} from '@/lib/scoring'
import { calculateCourseHandicap, applyHandicapPercent } from '@/lib/handicap'
import type { UserProfile, Score } from '@/types'

export function RoundDetailPage() {
    const { roundId } = useParams<{ roundId: string }>()
    const { currentUser, userProfile } = useAuth()
    const { round, loading: roundLoading } = useRound(roundId!)
    const { groups, loading: groupsLoading } = useGroups(roundId!)
    const { sideBets } = useSideBets(roundId!)
    const [joining, setJoining] = useState(false)
    const [joinPickerOpen, setJoinPickerOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [managingGroups, setManagingGroups] = useState(false)
    const [error, setError] = useState('')
    const [activating, setActivating] = useState(false)
    const [savingTeams, setSavingTeams] = useState(false)
    const [confirmForceComplete, setConfirmForceComplete] = useState(false)
    const [forcingComplete, setForcingComplete] = useState(false)
    const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({})
    const [eventHandicaps, setEventHandicaps] = useState<Record<string, number>>({})
    const [allScores, setAllScores] = useState<Score[]>([])
    const [computedCourseHandicaps, setComputedCourseHandicaps] = useState<Record<string, number>>({})
    const navigate = useNavigate()

    useEffect(() => {
        if (!round) return
        Promise.all(
            (round.memberIds ?? []).map((uid) => userService.getProfile(uid).then((p) => ({ uid, p })))
        ).then((results) => {
            const map: Record<string, UserProfile> = {}
            for (const { uid, p } of results) { if (p) map[uid] = p }
            setMemberProfiles(map)
        })
    }, [round])

    useEffect(() => {
        if (!round?.eventId) return
        eventService.getEvent(round.eventId).then((event) => {
            if (event?.handicaps) setEventHandicaps(event.handicaps)
        })
    }, [round?.eventId])

    useEffect(() => {
        if (!round || round.status === 'pending' || groups.length === 0) return
        Promise.all(
            groups.map((g) => scoreService.getAllScores(round.roundId, g.groupId))
        ).then((results) => setAllScores(results.flat()))
    }, [round, groups])

    // For pending rounds (no Score docs yet), compute courseHandicap from profiles + tee data
    useEffect(() => {
        if (!round || round.match?.scoring !== 'NET' || round.memberIds.length === 0) return
        async function compute() {
            const [course, event] = await Promise.all([
                courseService.getCourse(round!.courseId),
                round!.eventId ? eventService.getEvent(round!.eventId) : Promise.resolve(null),
            ])
            const tee = course?.tees.find((t) => t.teeId === round!.teeId)
            if (!tee) return
            const eventHandicaps = event?.handicaps ?? {}
            const handicapPercent = round!.match?.scoring === 'NET'
                ? (round!.match.handicapPercent ?? 80)
                : 100
            const profiles = await Promise.all(round!.memberIds.map((uid) => userService.getProfile(uid)))
            const map: Record<string, number> = {}
            for (const p of profiles) {
                if (!p) continue
                const hcpIndex = round!.eventId
                    ? (eventHandicaps[p.uid] ?? 0)
                    : (p.teeSheetHandicap ?? 0)
                const raw = calculateCourseHandicap(hcpIndex, tee.slope, tee.rating, tee.par)
                map[p.uid] = applyHandicapPercent(raw, handicapPercent)
            }
            setComputedCourseHandicaps(map)
        }
        compute()
    }, [round?.memberIds.join(','), round?.eventId, round?.courseId, round?.teeId, round?.match?.scoring])

    if (roundLoading || groupsLoading) {
        return (
            <div className="flex items-center justify-center pt-16">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!round) {
        return <Alert message="Round not found." />
    }

    const uid = currentUser!.uid
    const isParticipant = round.memberIds?.includes(uid)
    const isCreator = round.createdBy === uid
    const isAdmin = userProfile?.isAdmin ?? false
    const canManage = (isCreator || isAdmin) && round.status === 'pending'
    const userGroup = groups.find((g) => g.golferIds.includes(uid))
    const isCompleted = round.status === 'completed'
    const isStandalone = !round.eventId
    const isFull = isStandalone && (round.memberIds?.length ?? 0) >= 4
    const allGroupsSigned = groups.length > 0 && groups.every((g) => g.status === 'signed')
    const canForceComplete = isStandalone && isCreator && (round.status === 'active' || (isCompleted && !allGroupsSigned))

    // Compute winner summary for completed rounds
    const winnerSummary = isCompleted && allScores.length > 0 ? computeWinner(round, groups, allScores) : null

    async function handleJoin(targetGroupId?: string) {
        setJoining(true)
        setError('')
        try {
            if (targetGroupId) {
                await groupService.addGolferToGroup(round!.roundId, targetGroupId, uid)
                navigate(`/rounds/${round!.roundId}/groups/${targetGroupId}`)
            } else {
                const groupId = await groupService.createGroup(round!.roundId, uid)
                navigate(`/rounds/${round!.roundId}/groups/${groupId}`)
            }
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setJoining(false)
            setJoinPickerOpen(false)
        }
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            const memberIds = round!.memberIds ?? []
            await golferScoreService.deleteScoresByRound(round!.roundId)
            await roundService.deleteRound(round!.roundId)
            await Promise.all(memberIds.map((id) => userService.recalculateHandicap(id)))
            navigate('/')
        } catch {
            setError('Failed to delete round.')
            setDeleting(false)
            setConfirmDelete(false)
        }
    }

    async function handleTeamToggle(memberId: string) {
        if (!round) return
        const current = round.teamAssignments ?? {}
        const currentSide = current[memberId]
        const updated = { ...current }
        if (currentSide === undefined) updated[memberId] = 'A'
        else if (currentSide === 'A') updated[memberId] = 'B'
        else delete updated[memberId]
        setSavingTeams(true)
        await roundService.updateTeamAssignments(round.roundId, updated as Record<string, 'A' | 'B'>)
        setSavingTeams(false)
    }

    async function handleActivate() {
        if (!round) return
        setActivating(true)
        setError('')
        try {
            await roundService.activateRound(round.roundId)
        } catch {
            setError('Failed to activate round.')
        } finally {
            setActivating(false)
        }
    }

    async function handleForceComplete() {
        if (!round) return
        setForcingComplete(true)
        setError('')
        try {
            await roundService.forceCompleteRound(round.roundId)
            setConfirmForceComplete(false)
        } catch {
            setError('Failed to complete round.')
        } finally {
            setForcingComplete(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Back to event */}
            {round.eventId && (
                <Link
                    to={`/events/${round.eventId}`}
                    className="flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover text-white h-9 rounded-xl font-semibold transition-colors"
                >
                    Back to Event
                </Link>
            )}
            {/* Header */}
            <RoundCard
                round={round}
                currentUserId={currentUser?.uid ?? ''}
                showStatus
                hostName={memberProfiles[round.createdBy]?.displayName}
                noLink
            />

            {error && <Alert message={error} />}

            {/* Two Team assignment — creator only, pending only */}
            {round.scoringFormat === 'two_team' && isCreator && round.status === 'pending' && round.memberIds?.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                        Team Assignment
                    </h2>
                    <div className="bg-card-bg border border-card-border rounded-xl divide-y divide-card-border">
                        {round.memberIds.map((mid) => {
                            const side = round.teamAssignments?.[mid]
                            return (
                                <div key={mid} className="flex items-center justify-between px-4 py-3">
                                    <span className="text-sm text-brand">{memberProfiles[mid]?.displayName ?? '…'}</span>
                                    <button
                                        onClick={() => handleTeamToggle(mid)}
                                        disabled={savingTeams}
                                        className={`w-8 h-8 rounded-lg text-sm font-bold border-2 transition-colors ${side === 'A' ? 'border-brand bg-brand/10 text-brand'
                                                : side === 'B' ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                                                    : 'border-card-border bg-card-bg text-muted'
                                            }`}
                                    >
                                        {side ?? '—'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                    <p className="text-xs text-muted mt-2 text-center">Tap to cycle: unassigned → A → B</p>
                </div>
            )}

            {/* Winner banner + leaderboard button for completed rounds */}
            {isCompleted && !round.simpleGrossScore && (
                <div className="flex flex-col gap-4">
                    {winnerSummary && (
                        <div className="bg-card-bg border border-card-border rounded-xl px-4 py-3 flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🏆</span>
                                <div>
                                    <p className="text-xs text-muted uppercase tracking-wide font-semibold">Winner</p>
                                    <p className="text-brand font-semibold">{winnerSummary.label}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <Button onClick={() => navigate(`/rounds/${round.roundId}/summary?from=round`)} className="flex-1">
                            Leaderboard & Scorecards
                        </Button>
                        {round.scoringFormat !== 'scramble' && (
                            <button
                                type="button"
                                onClick={() => navigate(`/rounds/${round.roundId}/side-bets`)}
                                className="flex-1 h-9 px-4 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                            >
                                Side Bets
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Activate Round — admin only, pending */}
            {round.status === 'pending' && isAdmin && groups.length > 0 && (
                <Button loading={activating} onClick={handleActivate} className="w-full">
                    Activate Round
                </Button>
            )}

            {/* Invited side bets — active round, non-scramble, current user invited */}
            {round.status === 'active' && round.scoringFormat !== 'scramble' && (() => {
                const invitedBets = sideBets.filter((b) => b.invitedIds.includes(uid) && b.status === 'pending')
                if (invitedBets.length === 0) return null
                return (
                    <div className="bg-card-bg rounded-xl border border-card-border overflow-hidden">
                        <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between gap-3">
                            <span className="text-sm font-bold text-white">Bet Invites ({invitedBets.length})</span>
                            <span className="text-xs font-semibold text-white/70 animate-pulse">Action needed</span>
                        </div>
                        <div className="flex flex-col divide-y divide-card-border">
                            {invitedBets.map((bet) => (
                                <button
                                    key={bet.sideBetId}
                                    type="button"
                                    onClick={() => navigate(`/rounds/${round.roundId}/side-bets/${bet.sideBetId}`)}
                                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-blue-600/5 transition-colors"
                                >
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-sm font-semibold text-blue-600">
                                            {bet.type === 'NASSAU_GROSS' ? 'Nassau (Gross)'
                                            : bet.type === 'NASSAU_NET' ? 'Nassau (Net)'
                                            : bet.type === 'STROKE_GROSS' ? 'Stroke (Gross)'
                                            : bet.type === 'STROKE_NET' ? 'Stroke (Net)'
                                            : bet.type === 'MATCH_GROSS' ? 'Match (Gross)'
                                            : 'Match (Net)'}
                                        </span>
                                        <span className="text-xs text-muted">${bet.wagerPerPerson.toFixed(2)} / {bet.type.startsWith('NASSAU') ? 'segment' : 'person'}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-blue-600 shrink-0">Tap to respond →</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )
            })()}

            {/* Go to Scorecard — active round, user has a group */}
            {round.status === 'active' && userGroup && (userGroup.status === 'active' || userGroup.status === 'pending') && (
                <div className="flex gap-3">
                    <Button
                        onClick={() => navigate(`/rounds/${round.roundId}/groups/${userGroup.groupId}/scorecard`)}
                        className="flex-1"
                    >
                        Go to Scorecard
                    </Button>
                    {round.scoringFormat !== 'scramble' && (
                        <button
                            type="button"
                            onClick={() => navigate(`/rounds/${round.roundId}/side-bets`)}
                            className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                        >
                            Side Bets
                        </button>
                    )}
                </div>
            )}

            {/* Groups */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
                        Groups ({groups.length})
                    </h2>
                    {!isParticipant && round.status === 'pending' && !isFull && (
                        <Button size="sm" loading={joining} onClick={() => {
                            const hasSpace = groups.some((g) => g.golferIds.length < 4)
                            hasSpace ? setJoinPickerOpen(true) : handleJoin()
                        }}>
                            + Join Round
                        </Button>
                    )}
                    {!isParticipant && round.status === 'pending' && isFull && (
                        <span className="text-xs text-muted">Round full (4/4)</span>
                    )}
                    {isParticipant && !userGroup && round.status === 'pending' && (
                        <Button size="sm" loading={joining} onClick={() => {
                            const hasSpace = groups.some((g) => g.golferIds.length < 4)
                            hasSpace ? setJoinPickerOpen(true) : handleJoin()
                        }}>
                            + New Group
                        </Button>
                    )}
                </div>

                {groups.length === 0 ? (
                    <p className="text-muted text-sm text-center py-6">
                        No groups yet.{' '}
                        {round.status === 'pending' ? 'Be the first to join!' : ''}
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {groups.map((g) => {
                            const scoreDocHandicaps = Object.fromEntries(
                                allScores
                                    .filter((s) => g.golferIds.includes(s.golferId))
                                    .map((s) => [s.golferId, s.courseHandicap])
                            )
                            const courseHandicaps = Object.keys(scoreDocHandicaps).length > 0
                                ? scoreDocHandicaps
                                : computedCourseHandicaps
                            return (
                                <GroupCard
                                    key={g.groupId}
                                    group={g}
                                    roundId={round.roundId}
                                    currentUserId={uid}
                                    memberProfiles={memberProfiles}
                                    courseHandicaps={courseHandicaps}
                                    isNetMatch={round.match?.scoring === 'NET'}
                                />
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Creator/admin actions */}
            {canManage && (
                <>
                    <Button variant="secondary" onClick={() => navigate(`/rounds/${round.roundId}/edit`)}>
                        Edit Round
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(`/invite-golfers?targetType=round&targetId=${round.roundId}&roundName=${encodeURIComponent(round.name)}`)}>
                        Invite Golfers
                    </Button>
                    {groups.length > 1 && !round.match && (
                        <Button variant="secondary" onClick={() => setManagingGroups(true)}>
                            Manage Groups
                        </Button>
                    )}
                </>
            )}

            {/* Force complete — creator only, active or auto-closed standalone round with unsigned groups */}
            {canForceComplete && (
                confirmForceComplete ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-4">
                        <p className="text-sm text-brand text-center font-semibold">Mark round as complete?</p>
                        <p className="text-xs text-muted text-center">Players who haven't signed will be skipped. This cannot be undone.</p>
                        <div className="flex gap-2 mt-1">
                            <Button size="sm" loading={forcingComplete} onClick={handleForceComplete} className="flex-1 bg-green-600 hover:bg-green-700">
                                Yes, complete round
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setConfirmForceComplete(false)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="secondary" onClick={() => setConfirmForceComplete(true)} className="w-full">
                        Mark Round Complete
                    </Button>
                )
            )}

            {(canManage || isAdmin) && (
                confirmDelete ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-danger text-center">Delete this round? This cannot be undone.</p>
                        <div className="flex gap-2">
                            <Button size="sm" loading={deleting} onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700">
                                Yes, delete
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => setConfirmDelete(false)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="danger"
                        onClick={() => setConfirmDelete(true)}
                        className="w-full"
                    >
                        Delete Round
                    </Button>
                )
            )}

            {managingGroups && (
                <ManageGroupsModal
                    roundId={round.roundId}
                    groups={groups}
                    onClose={() => setManagingGroups(false)}
                    isScramble={round.scoringFormat === 'scramble'}
                    memberProfiles={memberProfiles}
                    eventHandicaps={Object.keys(eventHandicaps).length > 0 ? eventHandicaps : undefined}
                />
            )}

            {joinPickerOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4">
                    <div className="w-full max-w-lg bg-white border border-card-border rounded-2xl flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-card-border">
                            <h2 className="font-bold text-brand text-lg">Join a Group</h2>
                            <button
                                type="button"
                                onClick={() => setJoinPickerOpen(false)}
                                className="text-muted hover:text-brand transition-colors text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            {groups.filter((g) => g.golferIds.length < 4).map((g) => (
                                <button
                                    key={g.groupId}
                                    type="button"
                                    disabled={joining}
                                    onClick={() => handleJoin(g.groupId)}
                                    className="w-full text-left bg-card-bg border border-card-border rounded-xl px-4 py-3 hover:border-brand/50 transition-colors"
                                >
                                    <p className="text-brand font-semibold">{g.name ?? 'Group'}</p>
                                    <p className="text-xs text-muted mt-0.5">{g.golferIds.length} / 4 players</p>
                                </button>
                            ))}
                            <button
                                type="button"
                                disabled={joining}
                                onClick={() => handleJoin()}
                                className="w-full text-left bg-card-bg border border-card-border rounded-xl px-4 py-3 hover:border-brand/50 transition-colors"
                            >
                                <p className="text-brand font-semibold">+ Create New Group</p>
                                <p className="text-xs text-muted mt-0.5">Start a new group by yourself</p>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Winner computation ────────────────────────────────────────────────────────

function computeWinner(
    round: import('@/types').Round,
    groups: import('@/types').Group[],
    allScores: Score[],
): { label: string; winnerCount: number } | null {
    const rt = round.roundType
    const useNet = rt.includes('NET')
    const assignments = round.teamAssignments ?? {}

    // Individual stroke play
    if (rt === 'STROKE_GROSS' || rt === 'STROKE_NET') {
        const sorted = [...allScores].sort((a, b) =>
            ((useNet ? a.totalNet : a.totalGross) ?? 999) - ((useNet ? b.totalNet : b.totalGross) ?? 999)
        )
        if (sorted.length === 0) return null
        const minScore = useNet ? sorted[0].totalNet : sorted[0].totalGross
        const winners = sorted.filter((s) => (useNet ? s.totalNet : s.totalGross) === minScore)
        const label = winners.length === 1
            ? `${winners[0].golferName} (${minScore})`
            : `Tie — ${winners.map((s) => s.golferName).join(' / ')} (${minScore})`
        return { label, winnerCount: winners.length }
    }

    // Individual best ball
    if (rt === 'BEST_BALL_GROSS' || rt === 'BEST_BALL_NET') {
        const pairs: { names: string; total: number }[] = []
        for (const group of groups) {
            for (const teamIds of [group.teams?.teamA ?? [], group.teams?.teamB ?? []]) {
                if (teamIds.length === 0) continue
                const names = teamIds.map((id) => allScores.find((s) => s.golferId === id)?.golferName ?? id).join(' / ')
                const members = allScores.filter((s) => teamIds.includes(s.golferId))
                if (members.length === 0) continue
                const total = Math.min(...members.map((s) => (useNet ? s.totalNet : s.totalGross) ?? 999))
                pairs.push({ names, total })
            }
        }
        pairs.sort((a, b) => a.total - b.total)
        if (pairs.length === 0) return null
        const minTotal = pairs[0].total
        const winnerPairs = pairs.filter((p) => p.total === minTotal)
        return { label: `${winnerPairs.map((p) => p.names).join(' / ')} (${minTotal})`, winnerCount: winnerPairs.length }
    }

    // Two team best ball stroke — compare sum of best totals per team
    if (rt === 'TWO_TEAM_BB_STROKE_GROSS' || rt === 'TWO_TEAM_BB_STROKE_NET') {
        const scoreA = twoTeamAggregateScore('A', assignments, allScores, useNet)
        const scoreB = twoTeamAggregateScore('B', assignments, allScores, useNet)
        if (scoreA === scoreB) return { label: 'Tie — Team A and Team B', winnerCount: 2 }
        return scoreA < scoreB
            ? { label: `Team A (${scoreA})`, winnerCount: 1 }
            : { label: `Team B (${scoreB})`, winnerCount: 1 }
    }

    // Two team match play
    if (rt === 'TWO_TEAM_BB_MATCH_GROSS' || rt === 'TWO_TEAM_BB_MATCH_NET') {
        let totalA = 0, totalB = 0
        for (const group of groups) {
            const teamAIds = group.golferIds.filter((id) => assignments[id] === 'A')
            const teamBIds = group.golferIds.filter((id) => assignments[id] === 'B')
            const groupScores = allScores.filter((sc) => group.golferIds.includes(sc.golferId))
            const { aPoints, bPoints } = matchPlayPoints(teamAIds, teamBIds, groupScores, [], useNet)
            totalA += aPoints > bPoints ? 1 : aPoints === bPoints ? 0.5 : 0
            totalB += bPoints > aPoints ? 1 : aPoints === bPoints ? 0.5 : 0
        }
        if (totalA === totalB) return { label: `Tie — Team A and Team B (${totalA} pts each)`, winnerCount: 2 }
        return totalA > totalB
            ? { label: `Team A (${totalA} pts)`, winnerCount: 1 }
            : { label: `Team B (${totalB} pts)`, winnerCount: 1 }
    }

    return null
}
