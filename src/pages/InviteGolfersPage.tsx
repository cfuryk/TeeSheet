import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import { eventService } from '@/services/eventService'
import { roundService } from '@/services/roundService'
import { groupService } from '@/services/groupService'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Spinner, Toast } from '@/components/ui'
import type { UserProfile, Group } from '@/types'
import type { Timestamp } from 'firebase/firestore'

export function InviteGolfersPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const targetType = searchParams.get('targetType') as 'round' | 'event' | null
  const targetId = searchParams.get('targetId') ?? ''
  const groupId = searchParams.get('groupId') ?? ''

  const [loadingUsers, setLoadingUsers] = useState(true)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [staged, setStaged] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const uid = currentUser!.uid

  useEffect(() => {
    async function load() {
      let memberIds: string[] = [uid]
      if (targetType === 'event') {
        const ev = await eventService.getEvent(targetId)
        memberIds = ev?.memberIds ?? [uid]
      } else if (targetType === 'round') {
        const round = await roundService.getRound(targetId)
        memberIds = round?.memberIds ?? [uid]
      }
      const users = await userService.listAllUsers()
      setExistingMemberIds(memberIds)
      setAllUsers(users)
      setLoadingUsers(false)
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, targetType])

  const availableUsers = useMemo(() => {
    return allUsers.filter(
      (u) =>
        u.uid !== uid &&
        !existingMemberIds.includes(u.uid) &&
        u.displayName.toLowerCase().includes(search.toLowerCase()),
    )
  }, [allUsers, existingMemberIds, uid, search])

  function toggleStage(userId: string) {
    setStaged((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  async function handleConfirm() {
    if (staged.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      if (targetType === 'event') {
        for (const id of staged) {
          await eventService.joinEvent(targetId, id)
        }
        navigate(`/events/${targetId}`)
      } else if (targetType === 'round') {
        // Auto-fill groups: fetch current groups once, maintain local copy
        const groupsSnap = await getDocs(collection(db, 'rounds', targetId, 'groups'))
        const groups: Array<Group & { _localCount: number }> = groupsSnap.docs
          .map((d) => ({ ...(d.data() as Group), groupId: d.id }))
          .sort((a, b) => {
            const aTs = a.createdAt as Timestamp | null
            const bTs = b.createdAt as Timestamp | null
            if (!aTs || !bTs) return 0
            return aTs.seconds - bTs.seconds
          })
          .map((g) => ({ ...g, _localCount: g.golferIds.length }))

        for (const inviteeId of staged) {
          const slot = groups.find((g) => g._localCount < 4)
          if (slot) {
            await groupService.addGolferToGroup(targetId, slot.groupId, inviteeId)
            slot._localCount += 1
          } else {
            const newGroupId = await groupService.createGroup(targetId, inviteeId)
            groups.push({
              groupId: newGroupId,
              roundId: targetId,
              name: null,
              golferIds: [inviteeId],
              teams: null,
              golferNames: {},
              status: 'pending',
              _localCount: 1,
              createdAt: null as unknown as Timestamp,
              updatedAt: null as unknown as Timestamp,
            })
          }
        }
        navigate(groupId ? `/rounds/${targetId}/groups/${groupId}` : `/rounds/${targetId}`)
      }
    } catch {
      setError('Failed to add golfers. Please try again.')
      setSubmitting(false)
    }
  }

  function handleBack() {
    if (targetType === 'event') navigate(`/events/${targetId}`)
    else if (groupId) navigate(`/rounds/${targetId}/groups/${groupId}`)
    else navigate(`/rounds/${targetId}`)
  }

  const stagedUsers = allUsers.filter((u) => staged.includes(u.uid))

  if (loadingUsers) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="h-9 px-3 rounded-xl bg-btn-secondary hover:bg-btn-secondary-hover text-brand text-sm font-semibold transition-colors"
        >
          Back
        </button>
        <h1 className="text-2xl font-bold text-brand">Invite Golfers</h1>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-card-border rounded-xl px-4 py-3 text-sm text-brand placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* Staged chips */}
      {staged.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Selected ({staged.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {stagedUsers.map((u) => (
              <button
                key={u.uid}
                type="button"
                onClick={() => toggleStage(u.uid)}
                className="flex items-center gap-1.5 bg-brand/10 border border-brand/30 text-brand rounded-full px-3 py-1 text-sm"
              >
                {u.displayName} <span className="text-brand text-xs">✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Available users */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Available ({availableUsers.length})
        </p>
        {availableUsers.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">
            {search ? 'No golfers match your search.' : 'No golfers to invite.'}
          </p>
        ) : (
          <div className="bg-card-bg border border-card-border rounded-xl divide-y divide-card-border">
            {availableUsers.map((u) => {
              const isStaged = staged.includes(u.uid)
              const initials = u.displayName
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0].toUpperCase())
                .join('')
              return (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => toggleStage(u.uid)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isStaged ? 'bg-brand/10' : 'hover:bg-card-bg'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <span className="flex-1 text-sm text-brand">{u.displayName}</span>
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isStaged
                        ? 'bg-brand text-white'
                        : 'bg-card-bg text-muted border border-card-border'
                    }`}
                  >
                    {isStaged ? '✓' : '+'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-card-border px-4 py-3 flex flex-col gap-2 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted">Can't find a golfer?</p>
          <button
            type="button"
            onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Join me on US Bropen', url: window.location.origin })
                } else {
                  navigator.clipboard.writeText(window.location.origin).then(() => {
                    setToastVisible(true)
                  })
                }
              }}
            className="text-xs font-semibold text-white bg-danger hover:bg-danger/90 px-3 py-1.5 rounded-lg transition-colors"
          >
            Share / Invite
          </button>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 h-9 rounded-xl bg-btn-secondary hover:bg-btn-secondary-hover text-brand font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={staged.length === 0 || submitting}
            className="flex-1 h-9 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Spinner size="sm" />}
            {submitting
              ? 'Adding…'
              : `Add ${staged.length > 0 ? staged.length : ''} Golfer${staged.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
      {toastVisible && <Toast message="Link copied!" onDone={() => setToastVisible(false)} />}
    </div>
  )
}
