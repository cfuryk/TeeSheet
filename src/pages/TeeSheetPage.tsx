import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useEvent } from '@/hooks/useEvent'
import { useAuth } from '@/hooks/useAuth'
import { useMyRounds } from '@/hooks/useMyRounds'
import { Spinner, Card } from '@/components/ui'
import { USBROPEN_EVENT_ID } from '@/config/usbropen'
import type { Round } from '@/types'

function useBropenRounds(eventId: string) {
    const [rounds, setRounds] = useState<Round[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!eventId) {
            setLoading(false)
            return
        }
        const q = query(collection(db, 'rounds'), where('eventId', '==', eventId))
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => ({ roundId: d.id, ...d.data() }) as Round)
            setRounds(data)
            setLoading(false)
        })
        return unsub
    }, [eventId])

    return { rounds, loading }
}

function useMyGroup(roundId: string | undefined, userId: string | undefined) {
    const [groupId, setGroupId] = useState<string | null>(null)
    const [groupLoading, setGroupLoading] = useState(false)

    useEffect(() => {
        if (!roundId || !userId) return
        setGroupLoading(true)
        const q = query(collection(db, 'rounds', roundId, 'groups'), where('golferIds', 'array-contains', userId))
        const unsub = onSnapshot(q, (snap) => {
            setGroupId(snap.empty ? null : snap.docs[0].id)
            setGroupLoading(false)
        }, (err) => {
            console.error('[useMyGroup] error:', err)
            setGroupLoading(false)
        })
        return unsub
    }, [roundId, userId])

    return { groupId, groupLoading }
}

export function TeeSheetPage() {
    const { currentUser, loading: authLoading } = useAuth()
    const { event } = useEvent(USBROPEN_EVENT_ID)
    const { rounds } = useBropenRounds(USBROPEN_EVENT_ID)
    const { rounds: myRounds } = useMyRounds(currentUser?.uid ?? '')

    const activeStandaloneRounds = myRounds.filter(
        (r) => !r.eventId && (r.status === 'active' || r.status === 'pending')
    )

    // const loading = authLoading || eventLoading

    const activeRound = currentUser && event && event.memberIds?.includes(currentUser.uid)
        ? rounds.find((r) => r.status === 'active')
        : undefined

    const { groupId: myGroupId, groupLoading } = useMyGroup(activeRound?.roundId, currentUser?.uid)

    // Compute display date: range from earliest to latest round, or event date
    /*const dateDisplay = (() => {
        if (rounds.length === 0 || !event) return event ? formatDate(event.date) : null

        const sorted = [...rounds].sort((a, b) => a.date.seconds - b.date.seconds)
        const first = formatDate(sorted[0].date)
        const last = formatDate(sorted[sorted.length - 1].date)
        return first === last ? first : `${first} – ${last}`
    })()*/

    if (authLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Event info
            {loading ? (
                <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : event ? (
                <div className="flex flex-col gap-4 pt-2">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold text-brand">{event.name}</h1>
                        {dateDisplay && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-danger">{dateDisplay}</p>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-brand/10 rounded-full px-2.5 py-0.5">
                                    {event.memberIds.length}
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                                    </svg>
                                </span>
                            </div>
                        )}
                    </div>

                    {event.description && (
                        <p className="text-sm text-brand leading-relaxed">{event.description}</p>
                    )}
                </div>
            ) : (
                <div className="text-center py-16 text-muted">Event not found.</div>
            )} */}
            <Link
                to={`/events/${USBROPEN_EVENT_ID}`}
                className="bg-brand hover:bg-brand-hover text-white text-center h-9 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center"
            >
                Click For US Bropen Event Details
            </Link>

            {/* Active round callout */}
            {activeRound && (
                <Link
                    to={!groupLoading && myGroupId
                        ? `/rounds/${activeRound.roundId}/groups/${myGroupId}/scorecard`
                        : `/rounds/${activeRound.roundId}`}
                    className="block"
                >
                    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#3A6280' }}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white/70 uppercase tracking-wide">Current Round</span>
                            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                                Active
                            </span>
                        </div>
                        <p className="text-white font-bold text-lg leading-tight">{activeRound.name}</p>
                        <p className="text-white/70 text-sm">{activeRound.courseName} · {activeRound.teeName}</p>
                        <div className="mt-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-center h-9 rounded-lg font-semibold text-sm flex items-center justify-center">
                            {groupLoading ? 'Loading…' : 'Go To Round'}
                        </div>
                    </div>
                </Link>
            )}

            {/* Handicap tracking CTA */}
            <Card className="p-6 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-brand">Prepare - Track Your Handicap</h2>
                    <p className="text-sm">
                        We use handicap index to build the balanced teams for our matches. For those that do not have a GHIN (handicap index), the US Bropen app enables you to use an electronic scorecard to track your rounds leading up to the trip, to get a handicap.
                    </p>
                    <br />
                    <p className="text-sm text-muted">

                        You can create a full round, search &gt; find &gt; load your course, and invite your friends to use the full scoring function, or simply add a score after your round is over.  Clicking on your avatar initials in the top-right of the app will let you see your handicap and scores in your "My Scores" page.
                    </p>
                    <br />
                </div>
                <Link
                    to="/rounds/new"
                    className="bg-brand hover:bg-brand-hover text-white text-center h-9 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center"
                >
                    Create Round or Enter Score
                </Link>
            </Card >

            {/* Active standalone rounds */}
            {
                activeStandaloneRounds.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">My Active Rounds</h2>
                        {activeStandaloneRounds.map((r) => (
                            <Link key={r.roundId} to={`/rounds/${r.roundId}`} className="block">
                                <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#3A6280' }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-white/70 uppercase tracking-wide">Round in Progress</span>
                                        <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                                            Active
                                        </span>
                                    </div>
                                    <p className="text-white font-bold text-lg leading-tight">{r.name}</p>
                                    <p className="text-white/70 text-sm">{r.courseName} · {r.teeName}</p>
                                    <div className="mt-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-center h-9 rounded-lg font-semibold text-sm flex items-center justify-center">
                                        Go To Round
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )
            }
        </div >
    )
}
