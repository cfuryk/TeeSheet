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
import { ManageGroupsModal } from '@/components/round/ManageGroupsModal'
import { Button, Spinner, Alert, Badge } from '@/components/ui'
import { formatDate, roundTypeLabel } from '@/lib/formatters'
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [managingGroups, setManagingGroups] = useState(false)
  const [error, setError] = useState('')
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

  // Compute winner summary for completed rounds
  const winnerSummary = isCompleted && allScores.length > 0 ? computeWinner(round, groups, allScores) : null

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      const groupId = await groupService.createGroup(round!.roundId, uid)
      navigate(`/rounds/${round!.roundId}/groups/${groupId}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setJoining(false)
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
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1 mr-3">
            <p className="font-semibold text-white truncate">{round.name}</p>
            <p className="text-sm text-gray-400 truncate">{round.courseName}</p>
            <p className="text-sm text-gray-400 truncate">{round.teeName}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge
              label={round.status === 'active' ? 'In Progress' : round.status === 'completed' ? 'Completed' : 'Upcoming'}
              variant={round.status === 'active' ? 'yellow' : round.status === 'completed' ? 'green' : 'gray'}
            />
            <Badge label={`${round.memberIds?.length ?? 0} joined`} variant="gray" />
            <Badge label={isParticipant ? 'Joined' : 'Not joined'} variant={isParticipant ? 'green' : 'yellow'} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatDate(round.date)}</span>
          <Badge label={roundTypeLabel(round.roundType)} variant="gray" />
          {round.isPrivate && <Badge label="Private" variant="blue" />}
        </div>
      </div>

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
                    className={`w-8 h-8 rounded-lg text-sm font-bold border-2 transition-colors ${
                      side === 'A' ? 'border-green-500 bg-green-500/20 text-green-400'
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
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Winner</p>
                <p className="text-white font-semibold">{winnerSummary}</p>
              </div>
            </div>
          )}
          <Button onClick={() => navigate(`/rounds/${round.roundId}/summary`)}>
            Leaderboard & Scorecards
          </Button>
        </div>
      )}

      {/* Groups */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Groups ({groups.length})
          </h2>
          {!isParticipant && round.status === 'pending' && (
            <Button size="sm" loading={joining} onClick={handleJoin}>
              + Join Round
            </Button>
          )}
          {isParticipant && !userGroup && round.status === 'pending' && (
            <Button size="sm" loading={joining} onClick={handleJoin}>
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
            variant="secondary"
            onClick={() => setConfirmDelete(true)}
            className="w-full text-red-400 border-red-800 hover:border-red-600"
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
        />
      )}
    </div>
  )
}

// ─── Winner computation ────────────────────────────────────────────────────────

function computeWinner(
  round: import('@/types').Round,
  groups: import('@/types').Group[],
  allScores: Score[],
): string | null {
  const rt = round.roundType
  const useNet = rt.includes('NET')
  const assignments = round.teamAssignments ?? {}

  // Individual stroke play
  if (rt === 'STROKE_GROSS' || rt === 'STROKE_NET') {
    const sorted = [...allScores].sort((a, b) =>
      ((useNet ? a.totalNet : a.totalGross) ?? 999) - ((useNet ? b.totalNet : b.totalGross) ?? 999)
    )
    if (sorted.length === 0) return null
    const winner = sorted[0]
    const score = useNet ? winner.totalNet : winner.totalGross
    return `${winner.golferName} (${score})`
  }

  // Individual best ball — use totalGross/Net directly (best ball per hole needs tee data,
  // so we approximate by comparing pair totals which is close enough for a winner callout)
  if (rt === 'BEST_BALL_GROSS' || rt === 'BEST_BALL_NET') {
    const pairs: { names: string; total: number }[] = []
    for (const group of groups) {
      for (const teamIds of [group.teams?.teamA ?? [], group.teams?.teamB ?? []]) {
        if (teamIds.length === 0) continue
        const names = teamIds.map((id) => allScores.find((s) => s.golferId === id)?.golferName ?? id).join(' / ')
        const members = allScores.filter((s) => teamIds.includes(s.golferId))
        if (members.length === 0) continue
        // Best of the two totals as proxy (full best-ball calc needs hole data)
        const total = Math.min(...members.map((s) => (useNet ? s.totalNet : s.totalGross) ?? 999))
        pairs.push({ names, total })
      }
    }
    pairs.sort((a, b) => a.total - b.total)
    if (pairs.length === 0) return null
    return `${pairs[0].names} (${pairs[0].total})`
  }

  // Two team best ball stroke — compare sum of best totals per team
  if (rt === 'TWO_TEAM_BB_STROKE_GROSS' || rt === 'TWO_TEAM_BB_STROKE_NET') {
    const scoreA = twoTeamAggregateScore('A', assignments, allScores, useNet)
    const scoreB = twoTeamAggregateScore('B', assignments, allScores, useNet)
    if (scoreA === scoreB) return 'Tie — Team A and Team B'
    return scoreA < scoreB ? `Team A (${scoreA})` : `Team B (${scoreB})`
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
    if (totalA === totalB) return `Tie — Team A and Team B (${totalA} pts each)`
    return totalA > totalB ? `Team A (${totalA} pts)` : `Team B (${totalB} pts)`
  }

  return null
}
