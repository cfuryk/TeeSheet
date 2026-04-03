import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGroup } from '@/hooks/useGroup'
import { useScores } from '@/hooks/useScore'
import { useRound } from '@/hooks/useRound'
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
  const { scores, loading: scoresLoading } = useScores(roundId!, groupId!)
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [starting, setStarting] = useState(false)
  const [savingTeams, setSavingTeams] = useState(false)
  const [error, setError] = useState('')

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
  const allHolesScored = !scoresLoading && scores.length > 0 && scores.every((s) => s.scores.length === 18)
  const canEdit = isCreator && group.status === 'pending'

  async function handleStart() {
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

  async function handleSaveTeams(teams: Group['teams']) {
    setSavingTeams(true)
    try {
      await groupService.updateGroupTeams(roundId!, groupId!, teams)
    } finally {
      setSavingTeams(false)
    }
  }

  function handleStartEdit() {
    setEditName(group.name ?? '')
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
      <Button variant="secondary" size="sm" onClick={() => navigate(`/rounds/${roundId}`)}>
        ← Back to Round
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
          <div className="flex items-start justify-between">
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
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  aria-label="Edit group name"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
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
          {group.golferIds.map((gid) => (
            <PlayerSlot key={gid} golferId={gid} isCreator={round.createdBy === gid} />
          ))}
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
        <Button loading={starting} onClick={handleStart} className="w-full">
          Start Round
        </Button>
      )}

      {/* Resume button */}
      {group.status === 'active' && isInGroup && (
        <Button
          onClick={() => navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`)}
          className="w-full"
        >
          Resume Scorecard
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
            variant="secondary"
            onClick={() => setConfirmDelete(true)}
            className="w-full text-red-400 border-red-800 hover:border-red-600"
          >
            Delete Group
          </Button>
        )
      )}
    </div>
  )
}
