import { useState, useEffect } from 'react'
import type { Group } from '@/types'
import type { UserProfile } from '@/types'
import { userService } from '@/services/userService'
import { groupService } from '@/services/groupService'
import { Button, SelectField } from '@/components/ui'

interface Props {
  roundId: string
  groups: Group[]
  onClose: () => void
}

export function ManageGroupsModal({ roundId, groups, onClose }: Props) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [moving, setMoving] = useState<string | null>(null) // golferId being moved
  const [error, setError] = useState('')

  // Load all profiles for everyone in any group
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

  async function handleMove(golferId: string, fromGroupId: string, toGroupId: string) {
    if (!toGroupId || toGroupId === fromGroupId) return
    setMoving(golferId)
    setError('')
    try {
      await groupService.moveGolfer(roundId, fromGroupId, toGroupId, golferId)
    } catch {
      setError('Failed to move player.')
    } finally {
      setMoving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
          <h2 className="font-bold text-white text-lg">Manage Groups</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {error && <p className="text-sm text-red-400">{error}</p>}

          {groups.map((group) => (
            <div key={group.groupId} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
              <p className="font-semibold text-white mb-2">{group.name ?? 'Group'}</p>

              {group.golferIds.length === 0 ? (
                <p className="text-xs text-gray-500">No players</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {group.golferIds.map((gid) => {
                    const profile = profiles[gid]
                    const targetOptions = groups
                      .filter((g) => g.groupId !== group.groupId && g.golferIds.length < 4)
                      .map((g) => ({ value: g.groupId, label: g.name ?? 'Group' }))

                    return (
                      <div key={gid} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="flex-1 text-sm text-white truncate">
                          {profile?.displayName ?? 'Loading...'}
                        </span>
                        {targetOptions.length > 0 ? (
                          <SelectField
                            options={targetOptions}
                            placeholder="Move to…"
                            value=""
                            onChange={(toGroupId) => handleMove(gid, group.groupId, toGroupId)}
                            disabled={moving === gid}
                            className="w-36 shrink-0"
                          />
                        ) : (
                          <span className="text-xs text-gray-600 w-36 shrink-0 text-right">No other groups</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-700 shrink-0">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
