import { useNavigate } from 'react-router-dom'
import type { Group } from '@/types'
import { Card, Badge } from '@/components/ui'

interface Props {
  group: Group
  roundId: string
  currentUserId: string
}

const statusVariant: Record<Group['status'], 'gray' | 'yellow' | 'green' | 'blue'> = {
  pending: 'gray',
  active: 'yellow',
  completed: 'blue',
  signed: 'green',
}

const statusLabel: Record<Group['status'], string> = {
  pending: 'Pending',
  active: 'In Progress',
  completed: 'Completed',
  signed: 'Signed',
}

export function GroupCard({ group, roundId, currentUserId }: Props) {
  const isInGroup = group.golferIds.includes(currentUserId)
  const to = `/rounds/${roundId}/groups/${group.groupId}`
  const navigate = useNavigate()

  return (
    <button type="button" onClick={() => navigate(to)} className="w-full text-left">
      <Card className="p-4 hover:border-gray-500 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-white">
              {group.name ?? 'Group'}
            </p>
            <p className="text-sm text-gray-400">{group.golferIds.length}/4 players</p>
          </div>
          <Badge label={statusLabel[group.status]} variant={statusVariant[group.status]} />
        </div>
        {isInGroup && (
          <Badge label="You are in this group" variant="green" />
        )}
      </Card>
    </button>
  )
}
