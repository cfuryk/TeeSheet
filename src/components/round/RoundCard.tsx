import { Link } from 'react-router-dom'
import type { Round, Match } from '@/types'
import { Badge } from '@/components/ui'
import { formatDate, roundTypeLabel } from '@/lib/formatters'

function matchLabel(match: Match): string {
    const teamFormatLabel: Record<string, string> = {
        INDIVIDUAL: 'Individual',
        AGGREGATE: 'Aggregate',
        H2H_1V1: '1v1',
        H2H_2V2: '2v2',
    }
    const matchTypeLabel: Record<string, string> = {
        STROKE: 'Stroke',
        NASSAU: 'Nassau',
        MATCH_PLAY: 'Match Play',
        HAMMER: 'Hammer',
        HIGH_LOW: 'High Low',
        SKINS: 'Skins',
        BEST_BALL: 'Best Ball',
    }
    const parts: string[] = []
    if (match.teamFormat !== 'INDIVIDUAL') parts.push(teamFormatLabel[match.teamFormat] ?? match.teamFormat)
    parts.push(matchTypeLabel[match.matchType] ?? match.matchType)
    parts.push(match.scoring === 'NET' ? 'Net' : 'Gross')
    return parts.join(' · ')
}

interface Props {
    round: Round
    currentUserId: string
    showStatus?: boolean
    hostName?: string
    noLink?: boolean
    linkTo?: string
    addressMap?: React.ReactNode
}

export function RoundCard({ round, currentUserId: _currentUserId, showStatus: _showStatus, hostName: _hostName, noLink, linkTo, addressMap }: Props) {
    const to = linkTo ?? `/rounds/${round.roundId}`
    const hasLogo = /us\s*bropen/i.test(round.name)

    const inner = (
        <div className="bg-card-bg rounded-xl border border-card-border overflow-hidden">

            {/* Header */}
            <div className="bg-brand px-4 py-2.5 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white truncate">{round.name}</p>
                <p className="text-xs font-semibold text-white/70 shrink-0">{formatDate(round.date)}</p>
            </div>

            {/* Body */}
            <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-brand truncate">{round.courseName}</p>
                        {addressMap}
                    </div>
                    {(round.teeName || round.teeYardage != null) && (
                        <p className="text-sm text-muted">
                            {round.teeName}{round.teeYardage != null ? ` · ${round.teeYardage.toLocaleString()} yds` : ''}
                        </p>
                    )}
                    {(round.teeRating != null || round.teeSlope != null) && (
                        <p className="text-sm text-muted">
                            {[
                                round.teeRating != null ? `Rating ${round.teeRating}` : null,
                                round.teeSlope != null ? `Slope ${round.teeSlope}` : null,
                            ].filter(Boolean).join(' · ')}
                        </p>
                    )}
                </div>
                {hasLogo && (
                    <img src="/images/events/USBROPEN_LOGIN3.png" alt="US Bropen" className="h-16 w-auto shrink-0" />
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-card-border px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {round.match
                        ? <Badge label={matchLabel(round.match)} variant="green" />
                        : round.eventId && <Badge label={roundTypeLabel(round.roundType)} variant="green" />}
                    {round.isPrivate && <Badge label="Private" variant="purple" />}
                    {round.wager && round.wager > 0 && (
                        <Badge label={`$${round.wager.toFixed(2)} wager`} variant="blue" />
                    )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-brand/10 rounded-full px-2.5 py-0.5 shrink-0">
                    {round.memberIds?.length ?? 0}
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                </span>
            </div>

        </div>
    )

    if (noLink) return inner
    return <Link to={to} className="block">{inner}</Link>
}
