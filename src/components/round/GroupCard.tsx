import { useNavigate } from 'react-router-dom'
import type { Group, UserProfile } from '@/types'
import { Card } from '@/components/ui'

interface Props {
  group: Group
  roundId: string
  currentUserId: string
  memberProfiles?: Record<string, UserProfile>
  courseHandicaps?: Record<string, number>
  isNetMatch?: boolean
}

export function GroupCard({ group, roundId, memberProfiles = {}, courseHandicaps = {}, isNetMatch = false }: Props) {
  const to = `/rounds/${roundId}/groups/${group.groupId}`
  const navigate = useNavigate()

  const teamA = new Set(group.teams?.teamA ?? [])
  const teamB = new Set(group.teams?.teamB ?? [])
  const hasTeams = teamA.size > 0 || teamB.size > 0

  // If teams are set, show Team A in left column and Team B in right column.
  // Otherwise fall back to the original golferIds order padded to 4 slots.
  let leftSlots: (string | null)[]
  let rightSlots: (string | null)[]

  if (hasTeams) {
    leftSlots  = [group.teams!.teamA[0] ?? null, group.teams!.teamA[1] ?? null]
    rightSlots = [group.teams!.teamB[0] ?? null, group.teams!.teamB[1] ?? null]
  } else {
    const padded = [...group.golferIds, null, null, null, null].slice(0, 4)
    leftSlots  = [padded[0], padded[2]]
    rightSlots = [padded[1], padded[3]]
  }

  // Stroke advantage indicator: only shown for net matches with teams and real courseHandicap data
  let strokeIndicator: { team: 'A' | 'B'; diff: number } | null = null
  if (isNetMatch && hasTeams && Object.keys(courseHandicaps).length > 0) {
    const sumA = (group.teams?.teamA ?? []).reduce((acc, uid) => acc + (courseHandicaps[uid] ?? 0), 0)
    const sumB = (group.teams?.teamB ?? []).reduce((acc, uid) => acc + (courseHandicaps[uid] ?? 0), 0)
    const diff = Math.abs(sumA - sumB)
    if (diff > 0) {
      strokeIndicator = { team: sumA > sumB ? 'A' : 'B', diff }
    }
  }

  function slotClass(uid: string | null) {
    if (!uid) return 'bg-brand/10 text-card-border'
    if (hasTeams) {
      if (teamA.has(uid)) return 'bg-brand/20 text-brand border border-brand/30'
      if (teamB.has(uid)) return 'bg-danger/20 text-danger border border-danger/30'
    }
    return 'bg-brand/10 text-brand'
  }

  return (
    <button type="button" onClick={() => navigate(to)} className="w-full text-left">
      <Card className="p-4 hover:border-card-border transition-colors">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-brand">{group.name ?? 'Group'}</p>
            {strokeIndicator && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                strokeIndicator.team === 'A'
                  ? 'bg-brand/20 text-brand'
                  : 'bg-danger/20 text-danger'
              }`}>
                Team {strokeIndicator.team} +{strokeIndicator.diff} strokes
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[leftSlots, rightSlots].map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1.5">
              {hasTeams && (
                <span className={`text-xs font-semibold ${ci === 0 ? 'text-brand' : 'text-danger'}`}>
                  Team {ci === 0 ? 'A' : 'B'}
                </span>
              )}
              {col.map((uid, ri) => (
                <div
                  key={uid ?? `empty-${ci}-${ri}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold truncate min-w-0 ${slotClass(uid)}`}
                >
                  {uid ? (memberProfiles[uid]?.displayName ?? '…') : <span className="select-none">—</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </button>
  )
}
