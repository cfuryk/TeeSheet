import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGroup } from '@/hooks/useGroup'
import { useScores } from '@/hooks/useScore'
import { useRound } from '@/hooks/useRound'
import { useActiveRound } from '@/hooks/useActiveRound'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { userService } from '@/services/userService'
import { groupService } from '@/services/groupService'
import { roundService } from '@/services/roundService'
import { golferScoreService } from '@/services/golferScoreService'
import { eventService } from '@/services/eventService'
import { PlayerSlot } from '@/components/round/PlayerSlot'
import { TeamAssignment } from '@/components/round/TeamAssignment'
import type { UserProfile, Group } from '@/types'
import { Button, Spinner, Alert, Badge, Input } from '@/components/ui'

export function GroupPage() {
    const { roundId, groupId } = useParams<{ roundId: string; groupId: string }>()
    const { currentUser } = useAuth()
    const { round, loading: roundLoading } = useRound(roundId!)
    const { group, loading: groupLoading } = useGroup(roundId!, groupId!)
    const { scores, loading: scoresLoading } = useScores(roundId!, groupId!)
    const { activeRound } = useActiveRound(currentUser?.uid)
    const navigate = useNavigate()

    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
    const [eventHandicaps, setEventHandicaps] = useState<Record<string, number> | null>(null)
    const [, setStarting] = useState(false)
    const [savingTeams, setSavingTeams] = useState(false)
    const [error, setError] = useState('')

    // Active round conflict modal
    const [showConflict, setShowConflict] = useState(false)
    const [abandoning, setAbandoning] = useState(false)

    // Edit name state (event rounds only)
    const [editing, setEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [savingName, setSavingName] = useState(false)

    // Delete group state (event rounds only)
    const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false)
    const [deletingGroup, setDeletingGroup] = useState(false)

    // Delete round state (standalone rounds only)
    const [confirmDeleteRound, setConfirmDeleteRound] = useState(false)
    const [deletingRound, setDeletingRound] = useState(false)

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

    useEffect(() => {
        if (!round?.eventId) return
        eventService.getEvent(round.eventId).then((event) => {
            setEventHandicaps(event?.handicaps ?? {})
        })
    }, [round?.eventId])

    // Auto-start scoring when round is active and this group is still pending
    useEffect(() => {
        if (!round || !group) return
        if (round.status === 'active' && group.status === 'pending' && group.golferIds.includes(currentUser!.uid)) {
            setStarting(true)
            groupService.startGroup(roundId!, groupId!)
                .then(() => navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`))
                .catch((e) => { setError((e as Error).message); setStarting(false) })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round?.status, group?.status])

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
    const isStandalone = !round.eventId

    const allHolesScored = !scoresLoading && scores.length > 0 && scores.every((s) => s.scores.length === 18)
    const canEdit = isCreator && group.status === 'pending'

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

    async function handleDeleteGroup() {
        setDeletingGroup(true)
        try {
            await groupService.deleteGroup(roundId!, groupId!)
            navigate(`/rounds/${roundId}`)
        } catch {
            setError('Failed to delete group.')
            setDeletingGroup(false)
            setConfirmDeleteGroup(false)
        }
    }

    async function handleDeleteRound() {
        setDeletingRound(true)
        try {
            const memberIds = round!.memberIds ?? []
            await golferScoreService.deleteScoresByRound(round!.roundId)
            await roundService.deleteRound(round!.roundId)
            await Promise.all(memberIds.map((id) => userService.recalculateHandicap(id)))
            navigate('/')
        } catch {
            setError('Failed to delete round.')
            setDeletingRound(false)
            setConfirmDeleteRound(false)
        }
    }

    const statusVariant = { pending: 'gray', active: 'blue', completed: 'green', signed: 'green' } as const
    const statusLabel = { pending: 'Pending', active: 'Active', completed: 'Completed', signed: 'Signed' } as const

    const isScramble = round.scoringFormat === 'scramble'
    const lockedByUid = group.scorecardLockedBy ?? null
    const lockedByName = lockedByUid
      ? (profiles[lockedByUid]?.displayName ?? scores.find((s) => s.golferId === lockedByUid)?.golferName ?? 'a teammate')
      : null

    return (
        <div className="flex flex-col gap-4">
            {/* Back button */}
            <Button onClick={() => navigate(`/rounds/${roundId}`)}>
                Back to Round
            </Button>

            {/* Header */}
            <div className="bg-card-bg border border-card-border rounded-xl p-4">
                {!isStandalone && editing ? (
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
                            <h1 className="text-xl font-bold text-brand">{isStandalone ? round.name : (group.name ?? 'Group')}</h1>
                            <p className="text-muted text-sm">{round.courseName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {group.status === 'active' ? (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: '#3A6280' }}>
                                    Active
                                </span>
                            ) : (
                                <Badge label={statusLabel[group.status]} variant={statusVariant[group.status]} />
                            )}
                            {!isStandalone && canEdit && (
                                <button
                                    type="button"
                                    onClick={handleStartEdit}
                                    className="text-muted hover:text-brand transition-colors px-2 py-1 self-stretch flex items-center"
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

            {/* Scramble lock status — shown when another player is editing */}
            {isScramble && lockedByName && (
                <div className="bg-card-bg border border-card-border rounded-xl px-4 py-3 flex items-center gap-3">
                    <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <p className="text-sm text-muted">
                        Score entry in progress by <span className="font-semibold text-brand">{lockedByName}</span>
                    </p>
                </div>
            )}

            {/* Players */}
            <div>
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Players</h2>
                {(() => {
                    const g = group
                    const r = round
                    const teamA = g.teams?.teamA ?? []
                    const teamB = g.teams?.teamB ?? []
                    const hasTeams = teamA.length > 0 || teamB.length > 0

                    function handicapFor(gid: string): number | null {
                        if (eventHandicaps) return eventHandicaps[gid] ?? null
                        return profiles[gid]?.teeSheetHandicap ?? null
                    }

                    function renderPlayer(gid: string, team?: 'A' | 'B') {
                        const sc = scores.find((s) => s.golferId === gid)
                        const showScore = g.status !== 'pending' && sc
                        const borderClass = team === 'A'
                            ? 'border-l-4 border-brand'
                            : team === 'B'
                            ? 'border-l-4 border-danger'
                            : ''
                        return (
                            <div key={gid} className={`rounded-lg overflow-hidden ${borderClass}`}>
                                <PlayerSlot
                                    golferId={gid}
                                    isCreator={r.createdBy === gid}
                                    fallbackName={sc?.golferName}
                                    handicap={handicapFor(gid)}
                                    score={showScore ? (sc.totalGross ?? undefined) : undefined}
                                    holesPlayed={showScore ? sc.scores.length : undefined}
                                />
                            </div>
                        )
                    }

                    if (hasTeams) {
                        return (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-semibold text-brand">Team A</span>
                                    {teamA.map((gid) => renderPlayer(gid, 'A'))}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-semibold text-danger">Team B</span>
                                    {teamB.map((gid) => renderPlayer(gid, 'B'))}
                                </div>
                            </div>
                        )
                    }

                    return (
                        <div className="flex flex-col gap-2">
                            {g.golferIds.map((gid) => renderPlayer(gid))}
                            {g.golferIds.length < 4 && g.status === 'pending' && (
                                <PlayerSlot golferId={null} />
                            )}
                        </div>
                    )
                })()}
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

            {/* Invite Golfers — standalone rounds, pending, creator */}
            {isStandalone && (round.isPrivate ? isCreator : isInGroup) && group.status === 'pending' && group.golferIds.length < 4 && (
                <Button
                    variant="secondary"
                    onClick={() => navigate(`/invite-golfers?targetType=round&targetId=${roundId}&roundName=${encodeURIComponent(round.name)}&groupId=${groupId}`)}
                    className="w-full"
                >
                    + Invite Golfers
                </Button>
            )}

            {/* Go to Scorecard */}
            {group.status === 'active' && isInGroup && (
                <Button
                    onClick={() => navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`)}
                    className="w-full"
                >
                    Go to Scorecard
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
                <div className="text-center text-brand font-semibold">
                    All scores signed ✓
                </div>
            )}

            {/* Delete group — event rounds only, creator, pending */}
            {!isStandalone && canEdit && (
                confirmDeleteGroup ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-danger text-center">Delete this group? This cannot be undone.</p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                loading={deletingGroup}
                                onClick={handleDeleteGroup}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                Yes, delete
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setConfirmDeleteGroup(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="danger"
                        onClick={() => setConfirmDeleteGroup(true)}
                        className="w-full"
                    >
                        Delete Group
                    </Button>
                )
            )}

            {/* Delete round — standalone rounds only, creator */}
            {isStandalone && isCreator && (
                confirmDeleteRound ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-danger text-center">Delete this round? This cannot be undone.</p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                loading={deletingRound}
                                onClick={handleDeleteRound}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                Yes, delete
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setConfirmDeleteRound(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="danger"
                        onClick={() => setConfirmDeleteRound(true)}
                        className="w-full"
                    >
                        Delete Round
                    </Button>
                )
            )}

            {/* Active round conflict modal */}
            {showConflict && activeRound && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
                    <div className="w-full max-w-lg bg-card-bg rounded-xl overflow-hidden">
                        <div className="px-4 py-4 border-b border-card-border">
                            <h2 className="text-base font-semibold text-brand">Round Already In Progress</h2>
                            <p className="text-sm text-muted mt-1">
                                You're currently playing <span className="text-brand font-medium">{activeRound.name}</span>. What would you like to do?
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 p-4">
                            <button
                                type="button"
                                onClick={() => { setShowConflict(false); navigate(`/rounds/${activeRound.roundId}`) }}
                                className="w-full h-9 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold transition-colors"
                            >
                                Go Back &amp; Finish Active Round
                            </button>
                            <button
                                type="button"
                                disabled={abandoning}
                                onClick={handleAbandonAndStart}
                                className="w-full h-9 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold transition-colors"
                            >
                                {abandoning ? 'Starting...' : 'Abandon My Score & Start This Round'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowConflict(false)}
                                className="w-full h-9 rounded-xl bg-card-bg hover:bg-card-bg text-brand font-semibold transition-colors"
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
