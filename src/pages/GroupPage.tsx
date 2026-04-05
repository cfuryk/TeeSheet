import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGroup, useGroups } from '@/hooks/useGroup'
import { useScores } from '@/hooks/useScore'
import { useRound } from '@/hooks/useRound'
import { useActiveRound } from '@/hooks/useActiveRound'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { userService } from '@/services/userService'
import { groupService } from '@/services/groupService'
import { PlayerSlot } from '@/components/round/PlayerSlot'
import { TeamAssignment } from '@/components/round/TeamAssignment'
import type { UserProfile, Group } from '@/types'
import { Button, Spinner, Alert, Badge, Input } from '@/components/ui'

export function GroupPage() {
    const { roundId, groupId } = useParams<{ roundId: string; groupId: string }>()
    const { currentUser } = useAuth()
    const { round, loading: roundLoading } = useRound(roundId!)
    const { group, loading: groupLoading } = useGroup(roundId!, groupId!)
    const { groups: allGroups } = useGroups(roundId!)
    const { scores, loading: scoresLoading } = useScores(roundId!, groupId!)
    const { activeRound } = useActiveRound(currentUser?.uid)
    const navigate = useNavigate()

    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
    const [starting, setStarting] = useState(false)
    const [savingTeams, setSavingTeams] = useState(false)
    const [error, setError] = useState('')

    // Active round conflict modal
    const [showConflict, setShowConflict] = useState(false)
    const [abandoning, setAbandoning] = useState(false)

    // Edit name state
    const [editing, setEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [savingName, setSavingName] = useState(false)

    // Delete state
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        if (!group) return
        Promise.all(
            group.golferIds.map((uid) => userService.getProfile(uid).then((p) => ({ uid, p })))
        ).then((results) => {
            const map: Record<string, UserProfile> = {}
            for (const { uid, p } of results) {
                if (p) map[uid] = p
            }
            setProfiles(map)
        })
    }, [group])

    if (roundLoading || groupLoading) {
        return (
            <div className="flex items-center justify-center pt-16">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!group || !round) return <Alert message="Group not found." />

    const uid = currentUser!.uid
    const isCreator = round.createdBy === uid
    const isInGroup = group.golferIds.includes(uid)
    const isBestBall = round.roundType === 'BEST_BALL_GROSS' || round.roundType === 'BEST_BALL_NET'
    const isScramble = round.scoringFormat === 'scramble'
    const scrambleAdminId = group.groupAdminId ?? group.golferIds[0]

    // Uneven group size warning for scramble
    const unevenScrambleGroups = isScramble && allGroups.length > 1 &&
        new Set(allGroups.map((g) => g.golferIds.length)).size > 1
    const isTwoTeamBestBall = round.scoringFormat === 'two_team' && (
        round.roundType === 'TWO_TEAM_BB_MATCH_GROSS' ||
        round.roundType === 'TWO_TEAM_BB_MATCH_NET' ||
        round.roundType === 'TWO_TEAM_BB_STROKE_GROSS' ||
        round.roundType === 'TWO_TEAM_BB_STROKE_NET'
    )
    const allHolesScored = !scoresLoading && scores.length > 0 && scores.every((s) => s.scores.length === 18)
    const canEdit = isCreator && group.status === 'pending'

    // For individual best ball: group-level teams must be 2v2
    const groupTeamsValid = !isBestBall || (
        group.teams?.teamA.length === 2 && group.teams?.teamB.length === 2
    )
    // For two_team best ball: round-level teamAssignments must give exactly 2 A and 2 B in this group
    const twoTeamGroupValid = !isTwoTeamBestBall || (() => {
        const assignments = round.teamAssignments ?? {}
        const groupA = group.golferIds.filter((id) => assignments[id] === 'A')
        const groupB = group.golferIds.filter((id) => assignments[id] === 'B')
        return groupA.length === 2 && groupB.length === 2
    })()
    const teamsValid = groupTeamsValid && twoTeamGroupValid

    async function handleStart() {
        // If there's another active round (not this one), show the conflict modal
        if (activeRound && activeRound.roundId !== roundId) {
            setShowConflict(true)
            return
        }
        setStarting(true)
        setError('')
        try {
            await groupService.startGroup(roundId!, groupId!)
            navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`)
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setStarting(false)
        }
    }

    async function handleAbandonAndStart() {
        if (!activeRound) return
        setAbandoning(true)
        setError('')
        try {
            // Find the user's active group in the other round and remove only their score
            const snap = await getDocs(collection(db, 'rounds', activeRound.roundId, 'groups'))
            const activeGroup = snap.docs
                .map((d) => ({ groupId: d.id, ...d.data() } as import('@/types').Group))
                .find((g) => g.golferIds.includes(currentUser!.uid) && g.status === 'active')
            if (activeGroup) {
                await groupService.abandonGroup(activeRound.roundId, activeGroup.groupId, currentUser!.uid)
            }
            // Now start this group
            await groupService.startGroup(roundId!, groupId!)
            setShowConflict(false)
            navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`)
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setAbandoning(false)
        }
    }

    async function handleSaveTeams(teams: Group['teams']) {
        setSavingTeams(true)
        try {
            await groupService.updateGroupTeams(roundId!, groupId!, teams)
        } finally {
            setSavingTeams(false)
        }
    }

    function handleStartEdit() {
        setEditName(group?.name ?? '')
        setEditing(true)
    }

    async function handleSaveName() {
        setSavingName(true)
        try {
            await groupService.updateGroupName(roundId!, groupId!, editName.trim())
            setEditing(false)
        } catch {
            setError('Failed to update group name.')
        } finally {
            setSavingName(false)
        }
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            await groupService.deleteGroup(roundId!, groupId!)
            navigate(`/rounds/${roundId}`)
        } catch {
            setError('Failed to delete group.')
            setDeleting(false)
            setConfirmDelete(false)
        }
    }

    const statusVariant = { pending: 'gray', active: 'yellow', completed: 'blue', signed: 'green' } as const

    return (
        <div className="flex flex-col gap-4">
            {/* Back button */}
            <Button onClick={() => navigate(`/rounds/${roundId}`)}>
                Back to Round
            </Button>

            {/* Header */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                {editing ? (
                    <div className="flex flex-col gap-3">
                        <Input
                            label="Group Name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. Group 1"
                        />
                        <div className="flex gap-2">
                            <Button size="sm" loading={savingName} onClick={handleSaveName} className="flex-1">
                                Save
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditing(false)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-stretch justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white">{group.name ?? 'Group'}</h1>
                            <p className="text-gray-400 text-sm">{round.courseName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge label={group.status} variant={statusVariant[group.status]} />
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={handleStartEdit}
                                    className="text-gray-400 hover:text-white transition-colors px-2 py-1 self-stretch flex items-center"
                                    aria-label="Edit group name"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && <Alert message={error} />}

            {/* Players */}
            <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Players</h2>
                <div className="flex flex-col gap-2">
                    {group.golferIds.map((gid) => {
                        const sc = scores.find((s) => s.golferId === gid)
                        const showScore = group.status !== 'pending' && sc
                        return (
                            <div key={gid} className="flex items-center gap-2">
                                <div className="flex-1">
                                    <PlayerSlot
                                        golferId={gid}
                                        isCreator={round.createdBy === gid}
                                        fallbackName={sc?.golferName}
                                        score={showScore ? (sc.totalGross ?? undefined) : undefined}
                                        holesPlayed={showScore ? sc.scores.length : undefined}
                                    />
                                </div>
                                {isScramble && gid === scrambleAdminId && (
                                    <Badge label="Admin" variant="yellow" />
                                )}
                            </div>
                        )
                    })}
                    {group.golferIds.length < 4 && group.status === 'pending' && (
                        <PlayerSlot golferId={null} />
                    )}
                </div>
            </div>

            {/* Team assignment (best-ball only, creator or in-group) */}
            {isBestBall && (isCreator || isInGroup) && group.status === 'pending' && group.golferIds.length >= 2 && (
                <TeamAssignment
                    group={group}
                    profiles={profiles}
                    onSave={handleSaveTeams}
                    saving={savingTeams}
                />
            )}

            {/* Start group button */}
            {group.status === 'pending' && isCreator && isInGroup && (
                <div className="flex flex-col gap-2">
                    {unevenScrambleGroups && (
                        <p className="text-xs text-center text-yellow-500">
                            ⚠ Groups have uneven sizes. This is allowed but may affect fairness.
                        </p>
                    )}
                    <Button loading={starting} onClick={handleStart} className="w-full" disabled={!teamsValid}>
                        Start Round
                    </Button>
                    {!teamsValid && (
                        <p className="text-xs text-center text-yellow-500">
                            {isTwoTeamBestBall
                                ? 'This group needs exactly 2 players from each team (A and B) before starting.'
                                : 'Assign exactly 2 players to each team before starting.'}
                        </p>
                    )}
                </div>
            )}

            {/* Resume button */}
            {group.status === 'active' && isInGroup && (
                <Button
                    onClick={() => navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`)}
                    className="w-full"
                >
                    Resume Round
                </Button>
            )}

            {/* End round / sign button */}
            {group.status === 'active' && allHolesScored && isInGroup && (
                <Button
                    onClick={() => navigate(`/rounds/${roundId}/groups/${groupId}/sign`)}
                    className="w-full"
                >
                    End Round & Sign
                </Button>
            )}

            {/* Signed */}
            {group.status === 'signed' && (
                <div className="text-center text-green-400 font-semibold">
                    All scores signed ✓
                </div>
            )}

            {/* Delete group — creator only, pending only */}
            {canEdit && (
                confirmDelete ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-red-800 bg-red-900/20 p-4">
                        <p className="text-sm text-red-300 text-center">Delete this group? This cannot be undone.</p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                loading={deleting}
                                onClick={handleDelete}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                Yes, delete
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1"
                            >
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
                        Delete Group
                    </Button>
                )
            )}

            {/* Active round conflict modal */}
            {showConflict && activeRound && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
                    <div className="w-full max-w-lg bg-gray-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-700">
                            <h2 className="text-base font-semibold text-white">Round Already In Progress</h2>
                            <p className="text-sm text-gray-400 mt-1">
                                You're currently playing <span className="text-white font-medium">{activeRound.name}</span>. What would you like to do?
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 p-4">
                            <button
                                type="button"
                                onClick={() => { setShowConflict(false); navigate(`/rounds/${activeRound.roundId}`) }}
                                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
                            >
                                Go Back & Finish Active Round
                            </button>
                            <button
                                type="button"
                                disabled={abandoning}
                                onClick={handleAbandonAndStart}
                                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold transition-colors"
                            >
                                {abandoning ? 'Starting...' : 'Abandon My Score & Start This Round'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowConflict(false)}
                                className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
