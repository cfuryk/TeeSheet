import { useNavigate } from 'react-router-dom'
import type { Group, UserProfile } from '@/types'
import { Card } from '@/components/ui'

interface Props {
  group: Group
  roundId: string
  currentUserId: string
  memberProfiles?: Record<string, UserProfile>
}

export function GroupCard({ group, roundId, memberProfiles = {} }: Props) {
  const to = `/rounds/${roundId}/groups/${group.groupId}`
  const navigate = useNavigate()

  // Pad to 4 slots so the grid is always 2×2
  const slots: (string | null)[] = [...group.golferIds, null, null, null, null].slice(0, 4)

  return (
    <button type="button" onClick={() => navigate(to)} className="w-full text-left">
      <Card className="p-4 hover:border-card-border transition-colors">
        <div className="mb-3">
          <p className="font-semibold text-brand">{group.name ?? 'Group'}</p>
          <p className="text-sm text-muted">{group.golferIds.length}/4 players</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {slots.map((uid, i) => (
            <div
              key={uid ?? `empty-${i}`}
              className="px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold truncate min-w-0"
            >
              {uid ? (memberProfiles[uid]?.displayName ?? '…') : <span className="text-card-border select-none">—</span>}
            </div>
          ))}
        </div>
      </Card>
    </button>
  )
}
