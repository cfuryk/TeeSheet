import { Link } from 'react-router-dom'
import type { Round } from '@/types'
import { Card, Badge } from '@/components/ui'
import { formatDate, roundTypeLabel } from '@/lib/formatters'

interface Props {
    round: Round
    currentUserId: string
    showStatus?: boolean
    hostName?: string
    noLink?: boolean
    linkTo?: string
}

const statusVariant: Record<Round['status'], 'blue' | 'yellow' | 'green' | 'gray'> = {
    active: 'blue',
    pending: 'yellow',
    completed: 'green',
}

const statusLabel: Record<Round['status'], string> = {
    active: 'Active',
    pending: 'Upcoming',
    completed: 'Completed',
}

export function RoundCard({ round, currentUserId, showStatus, hostName, noLink, linkTo }: Props) {
    const to = linkTo ?? `/rounds/${round.roundId}`
    const joined = currentUserId && round.memberIds?.includes(currentUserId)

    const inner = (
        <Card className="p-4 hover:border-gray-500 transition-colors">
            <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1 mr-3">
                    <p className="font-semibold text-white truncate">{round.name}</p>
                    <p className="text-sm text-gray-400 flex gap-1 min-w-0">
                        <span className="truncate">{round.courseName}</span>
                        <span className="shrink-0 text-gray-600">·</span>
                        <span className="shrink-0">{round.teeName}</span>
                    </p>
                    <p className="text-sm text-gray-400 flex gap-1">
                        {round.eventId && <span className="text-green-400">{formatDate(round.date)}</span>}
                        {round.eventId && <span className="text-gray-600">·</span>}
                        <span className="text-green-400">Host: {hostName}</span>
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {showStatus && (
                        <Badge label={statusLabel[round.status]} variant={statusVariant[round.status]} />
                    )}
                    {currentUserId && joined && (
                        <Badge label="Joined" variant="green" />
                    )}
                </div>
            </div>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {round.eventId && <Badge label={roundTypeLabel(round.roundType)} variant="gray" />}
                    {round.isPrivate && <Badge label="Private" variant="purple" />}
                    {round.wager && round.wager > 0 && (
                        <Badge label={`$${round.wager.toFixed(2)} wager`} variant="blue" />
                    )}
                    {!round.eventId && (
                        <span className="text-sm text-gray-400">{formatDate(round.date)}</span>
                    )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-300 bg-gray-700/80 border border-gray-600 rounded-full px-2.5 py-0.5">
                    {round.memberIds?.length ?? 0}
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                </span>
            </div>
        </Card>
    )

    if (noLink) return inner
    return <Link to={to} className="block">{inner}</Link>
}
