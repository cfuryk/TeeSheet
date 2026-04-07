import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import { useRound } from '@/hooks/useRound'
import { useGroups } from '@/hooks/useGroup'
import { groupService } from '@/services/groupService'
import { roundService } from '@/services/roundService'
import { scoreService } from '@/services/scoreService'
import { golferScoreService } from '@/services/golferScoreService'
import { GroupCard } from '@/components/round/GroupCard'
import { RoundCard } from '@/components/round/RoundCard'
import { ManageGroupsModal } from '@/components/round/ManageGroupsModal'
import { InviteModal } from '@/components/event/InviteModal'
import { Button, Spinner, Alert } from '@/components/ui'
import {
    matchPlayPoints,
    twoTeamAggregateScore,
} from '@/lib/scoring'
import type { UserProfile, Score } from '@/types'

export function RoundDetailPage() {
    const { roundId } = useParams<{ roundId: string }>()
    const { currentUser, userProfile } = useAuth()
    const { round, loading: roundLoading } = useRound(roundId!)
    const { groups, loading: groupsLoading } = useGroups(roundId!)
    const [joining, setJoining] = useState(false)
    const [joinPickerOpen, setJoinPickerOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [managingGroups, setManagingGroups] = useState(false)
    const [error, setError] = useState('')
    const [showInvite, setShowInvite] = useState(false)
    const [savingTeams, setSavingTeams] = useState(false)
    const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({})
    const [allScores, setAllScores] = useState<Score[]>([])
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
        if (!round || round.status !== 'completed' || groups.length === 0) return
        Promise.all(
            groups.map((g) => scoreService.getAllScores(round.roundId, g.groupId))
        ).then((results) => setAllScores(results.flat()))
    }, [round, groups])

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

    return (
        <div className="flex flex-col gap-4">
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
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Team Assignment
                    </h2>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl divide-y divide-gray-700">
                        {round.memberIds.map((mid) => {
                            const side = round.teamAssignments?.[mid]
                            return (
                                <div key={mid} className="flex items-center justify-between px-4 py-3">
                                    <span className="text-sm text-white">{memberProfiles[mid]?.displayName ?? '…'}</span>
                                    <button
                                        onClick={() => handleTeamToggle(mid)}
                                        disabled={savingTeams}
                                        className={`w-8 h-8 rounded-lg text-sm font-bold border-2 transition-colors ${side === 'A' ? 'border-green-500 bg-green-500/20 text-green-400'
                                                : side === 'B' ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                                                    : 'border-gray-600 bg-gray-700 text-gray-500'
                                            }`}
                                    >
                                        {side ?? '—'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">Tap to cycle: unassigned → A → B</p>
                </div>
            )}

            {/* Winner banner + leaderboard button for completed rounds */}
            {isCompleted && !round.simpleGrossScore && (
                <div className="flex flex-col gap-4">
                    {winnerSummary && (
                        <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🏆</span>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Winner</p>
                                    <p className="text-white font-semibold">{winnerSummary.label}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <Button onClick={() => navigate(`/rounds/${round.roundId}/summary?from=round`)}>
                        Leaderboard & Scorecards
                    </Button>
                </div>
            )}

            {/* Resume Scorecard — active round, user has a group */}
            {round.status === 'active' && userGroup && userGroup.status === 'active' && (
                <Button
                    onClick={() => navigate(`/rounds/${round.roundId}/groups/${userGroup.groupId}/scorecard`)}
                    className="w-full"
                >
                    Resume Round
                </Button>
            )}

            {/* Groups */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
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
                        <span className="text-xs text-gray-500">Round full (4/4)</span>
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
                    <p className="text-gray-500 text-sm text-center py-6">
                        No groups yet.{' '}
                        {round.status === 'pending' ? 'Be the first to join!' : ''}
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {groups.map((g) => (
                            <GroupCard
                                key={g.groupId}
                                group={g}
                                roundId={round.roundId}
                                currentUserId={uid}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Creator/admin actions */}
            {canManage && (
                <>
                    <Button variant="secondary" onClick={() => navigate(`/rounds/${round.roundId}/edit`)}>
                        Edit Round
                    </Button>
                    <Button onClick={() => setShowInvite(true)}>
                        + Invite Golfers
                    </Button>
                    {groups.length > 1 && (
                        <Button variant="secondary" onClick={() => setManagingGroups(true)}>
                            Manage Groups
                        </Button>
                    )}
                </>
            )}

            {(canManage || isAdmin) && (
                confirmDelete ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-red-800 bg-red-900/20 p-4">
                        <p className="text-sm text-red-300 text-center">Delete this round? This cannot be undone.</p>
                        <div className="flex gap-2">
                            <Button size="sm" loading={deleting} onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700">
                                Yes, delete
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)} className="flex-1">
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

            {showInvite && (
                <InviteModal
                    targetType="round"
                    targetId={round.roundId}
                    createdBy={uid}
                    targetName={round.name}
                    onClose={() => setShowInvite(false)}
                />
            )}

            {managingGroups && (
                <ManageGroupsModal
                    roundId={round.roundId}
                    groups={groups}
                    onClose={() => setManagingGroups(false)}
                />
            )}

            {joinPickerOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4">
                    <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <h2 className="font-bold text-white text-lg">Join a Group</h2>
                            <button
                                type="button"
                                onClick={() => setJoinPickerOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
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
                                    className="w-full text-left bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 hover:border-green-500/50 transition-colors"
                                >
                                    <p className="text-white font-semibold">{g.name ?? 'Group'}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{g.golferIds.length} / 4 players</p>
                                </button>
                            ))}
                            <button
                                type="button"
                                disabled={joining}
                                onClick={() => handleJoin()}
                                className="w-full text-left bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 hover:border-green-500/50 transition-colors"
                            >
                                <p className="text-white font-semibold">+ Create New Group</p>
                                <p className="text-xs text-gray-400 mt-0.5">Start a new group by yourself</p>
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
