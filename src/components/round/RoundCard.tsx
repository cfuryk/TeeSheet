import { Link } from 'react-router-dom'
import type { Round } from '@/types'
import { Card, Badge } from '@/components/ui'
import { formatDate, roundTypeLabel } from '@/lib/formatters'

interface Props {
  round: Round
  currentUserId: string
  showStatus?: boolean
}

const statusVariant: Record<Round['status'], 'yellow' | 'green' | 'gray'> = {
  active: 'yellow',
  pending: 'gray',
  completed: 'green',
}

const statusLabel: Record<Round['status'], string> = {
  active: 'In Progress',
  pending: 'Upcoming',
  completed: 'Completed',
}

export function RoundCard({ round, currentUserId, showStatus }: Props) {
  const to = `/rounds/${round.roundId}`
  const joined = currentUserId && round.memberIds?.includes(currentUserId)

  return (
    <Link to={to} className="block">
      <Card className="p-4 hover:border-gray-500 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1 mr-3">
            <p className="font-semibold text-white truncate">{round.name}</p>
            <p className="text-sm text-gray-400 truncate">{round.courseName}</p>
            <p className="text-sm text-gray-400 truncate">{round.teeName}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {showStatus && (
              <Badge label={statusLabel[round.status]} variant={statusVariant[round.status]} />
            )}
            <Badge
              label={`${round.memberIds?.length ?? 0} joined`}
              variant="gray"
            />
            {currentUserId && (
              <Badge
                label={joined ? 'Joined' : 'Not joined'}
                variant={joined ? 'green' : 'yellow'}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatDate(round.date)}</span>
          <Badge label={roundTypeLabel(round.roundType)} variant="gray" />
          {round.isPrivate && <Badge label="Private" variant="blue" />}
        </div>
      </Card>
    </Link>
  )
}
