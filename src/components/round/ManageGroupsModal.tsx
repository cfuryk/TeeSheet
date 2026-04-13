import { useState, useEffect } from 'react'
import type { Group } from '@/types'
import type { UserProfile } from '@/types'
import { userService } from '@/services/userService'
import { groupService } from '@/services/groupService'
import { Button } from '@/components/ui'

interface Props {
  roundId: string
  groups: Group[]
  onClose: () => void
}

interface Selection {
  golferId: string
  groupId: string
}

export function ManageGroupsModal({ roundId, groups, onClose }: Props) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [selected, setSelected] = useState<Selection | null>(null)
  const [swapping, setSwapping] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const allIds = [...new Set(groups.flatMap((g) => g.golferIds))]
    Promise.all(allIds.map((uid) => userService.getProfile(uid).then((p) => ({ uid, p })))).then(
      (results) => {
        const map: Record<string, UserProfile> = {}
        for (const { uid, p } of results) {
          if (p) map[uid] = p
        }
        setProfiles(map)
      },
    )
  }, [groups])

  async function handleTap(golferId: string, groupId: string) {
    if (swapping) return
    setError('')

    if (!selected) {
      // First tap — select
      setSelected({ golferId, groupId })
      return
    }

    if (selected.golferId === golferId) {
      // Tap same person — deselect
      setSelected(null)
      return
    }

    // Tap different person — swap
    setSwapping(true)
    try {
      await groupService.swapGolfers(roundId, selected, { golferId, groupId })
    } catch {
      setError('Failed to swap players.')
    } finally {
      setSwapping(false)
      setSelected(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4">
      <div className="w-full max-w-lg bg-white border border-card-border rounded-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-card-border shrink-0">
          <div>
            <h2 className="font-bold text-brand text-lg">Manage Groups</h2>
            <p className="text-xs text-muted mt-0.5">
              {selected
                ? `${profiles[selected.golferId]?.displayName ?? '…'} selected — tap another player to swap`
                : 'Tap a player to select, then tap another to swap'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-brand transition-colors text-2xl leading-none ml-3"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {error && <p className="text-sm text-danger">{error}</p>}

          {groups.map((group) => (
            <div key={group.groupId} className="bg-card-bg border border-card-border rounded-xl p-3">
              <p className="font-semibold text-brand mb-2">{group.name ?? 'Group'}</p>

              {group.golferIds.length === 0 ? (
                <p className="text-xs text-muted">No players</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {group.golferIds.map((gid) => {
                    const isSelected = selected?.golferId === gid
                    const name = profiles[gid]?.displayName ?? '…'
                    return (
                      <button
                        key={gid}
                        type="button"
                        onClick={() => handleTap(gid, group.groupId)}
                        disabled={swapping}
                        className={[
                          'px-3 py-2 rounded-lg text-xs font-semibold truncate transition-colors text-left',
                          isSelected
                            ? 'bg-brand text-white ring-2 ring-brand ring-offset-1'
                            : 'bg-brand/10 text-brand hover:bg-brand/20',
                          swapping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                        ].join(' ')}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-card-border shrink-0">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
