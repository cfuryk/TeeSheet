import type { Group } from '@/types'
import type { UserProfile } from '@/types'
import { Button } from '@/components/ui'

interface Props {
  group: Group
  profiles: Record<string, UserProfile>
  onSave: (teams: Group['teams']) => void
  saving?: boolean
}

export function TeamAssignment({ group, profiles, onSave, saving = false }: Props) {
  const golfers = group.golferIds
  const teamA = group.teams?.teamA ?? []
  const teamB = group.teams?.teamB ?? []

  function isTeamA(uid: string) { return teamA.includes(uid) }
  function isTeamB(uid: string) { return teamB.includes(uid) }

  function toggle(uid: string) {
    let newA = [...teamA]
    let newB = [...teamB]
    if (isTeamA(uid)) {
      newA = newA.filter((x) => x !== uid)
      newB = [...newB, uid]
    } else if (isTeamB(uid)) {
      newB = newB.filter((x) => x !== uid)
    } else {
      newA = [...newA, uid]
    }
    const teams: Group['teams'] = newA.length > 0 || newB.length > 0
      ? { teamA: newA, teamB: newB }
      : null
    onSave(teams)
  }

  function teamLabel(uid: string) {
    if (isTeamA(uid)) return 'A'
    if (isTeamB(uid)) return 'B'
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 uppercase tracking-wide">Team Assignment (tap to cycle A → B → none)</p>
      {golfers.map((uid) => {
        const label = teamLabel(uid)
        const name = profiles[uid]?.displayName ?? uid
        return (
          <button
            key={uid}
            onClick={() => toggle(uid)}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-700 border border-gray-600 hover:border-green-500 transition-colors"
          >
            <span className="text-white font-medium">{name}</span>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
              label === 'A' ? 'bg-green-500 text-white' :
              label === 'B' ? 'bg-blue-500 text-white' :
              'bg-gray-600 text-gray-400'
            }`}>
              {label ?? '—'}
            </span>
          </button>
        )
      })}
      {saving && <p className="text-xs text-gray-500 text-center">Saving...</p>}
      <Button variant="secondary" size="sm" onClick={() => onSave(null)}>
        Clear Teams
      </Button>
    </div>
  )
}
