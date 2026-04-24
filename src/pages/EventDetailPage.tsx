import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEvent } from '@/hooks/useEvent'
import { RoundCard } from '@/components/round/RoundCard'
import { Spinner, Alert, Card, TabBar } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { roundService } from '@/services/roundService'
import { userService } from '@/services/userService'
import { eventService } from '@/services/eventService'
import type { Round, UserProfile } from '@/types'
import { BROPEN_2026_PARTICIPANTS, ROOM_ASSIGNMENTS, formatPhone, getInitials } from '@/data/bropen2026Participants'

type TabKey = 'rounds' | 'participants' | 'info'

function getInitialTab(): TabKey {
    try {
        const stored = localStorage.getItem('event-tab') as TabKey | null
        return stored ?? 'info'
    } catch {
        return 'rounds'
    }
}

export function EventDetailPage() {
    const { eventId } = useParams<{ eventId: string }>()
    const { event, loading } = useEvent(eventId!)
    const { currentUser, userProfile } = useAuth()
    const [rounds, setRounds] = useState<Round[]>([])
    const [roundsLoading, setRoundsLoading] = useState(false)
    const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([])
    const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab)

    function handleTabChange(tab: string) {
        setActiveTab(tab as TabKey)
        try { localStorage.setItem('event-tab', tab) } catch { /* ignore */ }
    }

    useEffect(() => {
        if (!event || event.roundIds.length === 0) { setRounds([]); return }
        setRoundsLoading(true)
        Promise.all(event.roundIds.map((rid) => roundService.getRound(rid))).then((results) => {
            const loaded = results.filter(Boolean) as Round[]
            loaded.sort((a, b) => a.date.seconds - b.date.seconds)
            setRounds(loaded)
            setRoundsLoading(false)
        })
    }, [event?.roundIds.join(',')])

    useEffect(() => {
        if (!event?.memberIds?.length) { setMemberProfiles([]); return }
        Promise.all(event.memberIds.map((uid) => userService.getProfile(uid))).then((results) => {
            setMemberProfiles(results.filter(Boolean) as UserProfile[])
        })
    }, [event?.memberIds.join(',')])

    if (loading) {
        return (
            <div className="flex items-center justify-center pt-16">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!event) return <Alert message="Event not found." />

    const uid = currentUser!.uid
    const isMember = event.memberIds?.includes(uid)
    const isCreator = event.createdBy === uid
    const isAdmin = userProfile?.isAdmin ?? false
    const canEdit = isCreator || isAdmin

    if (event.isPrivate && !isMember && !isCreator) {
        return (
            <div className="flex flex-col items-center justify-center pt-16 gap-3">
                <p className="text-brand font-semibold">This event is private.</p>
                <p className="text-sm text-muted">You need an invitation to view this event.</p>
            </div>
        )
    }

    const tabs = [
        { key: 'info', label: 'Info' },
        { key: 'rounds', label: 'Rounds' },
        { key: 'participants', label: 'Participants' },
    ]

    return (
        <div className="flex flex-col gap-0 -mt-4">

            <TabBar tabs={tabs} active={activeTab} onChange={handleTabChange} />

            <div className="flex flex-col gap-4 pt-4">

                {/* Rounds tab */}
                {activeTab === 'rounds' && (
                    <div className="flex flex-col gap-3">
                        {roundsLoading ? (
                            event.roundIds.map((rid) => (
                                <div key={rid} className="h-16 bg-card-bg rounded-xl animate-pulse" />
                            ))
                        ) : rounds.length === 0 ? (
                            <Card className="p-4 text-center text-muted text-sm">No rounds yet.</Card>
                        ) : (
                            rounds.map((round) => {
                                const address = TEE_TIMES.find((course) => course.course === round.courseName)?.address
                                const map = (address && <MapLink address={address} label="Map" />)
                                return (
                                    <RoundCard key={round.roundId} round={round} currentUserId={uid} addressMap={map} />
                                )
                            })
                        )}
                        {isCreator && (
                            <Link
                                to={`/rounds/new/full?eventId=${event.eventId}`}
                                className="flex items-center justify-center w-full bg-brand hover:bg-brand-hover text-white h-9 rounded-xl font-semibold transition-colors text-sm"
                            >
                                + Add Round
                            </Link>
                        )}
                    </div>
                )}

                {/* Participants tab */}
                {activeTab === 'participants' && (
                    <div className="flex flex-col gap-3 pb-4">
                        {ROOM_ASSIGNMENTS.map(([nameA, nameB], i) => {
                            const pA = BROPEN_2026_PARTICIPANTS.find((p) => p.name === nameA)!
                            const pB = BROPEN_2026_PARTICIPANTS.find((p) => p.name === nameB)!
                            const profileA = memberProfiles.find((mp) => mp.email.toLowerCase() === pA.email.toLowerCase() || mp.displayName.toLowerCase() === pA.name.toLowerCase())
                            const profileB = memberProfiles.find((mp) => mp.email.toLowerCase() === pB.email.toLowerCase() || mp.displayName.toLowerCase() === pB.name.toLowerCase())
                            return (
                                <div key={i} className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
                                    <div className="bg-brand px-4 py-2.5 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
                                            <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                                            <path d="M12 10v10" />
                                            <path d="M2 20h20" />
                                        </svg>
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/80">Room {i + 1}</span>
                                    </div>
                                    <div className="divide-y divide-card-border">
                                        <BropenParticipantRow name={pA.name} email={pA.email} phone={pA.phone} registered={!!profileA} handicap={profileA ? (event.handicaps[profileA.uid] ?? null) : null} canEdit={canEdit} eventId={event.eventId} profileUid={profileA?.uid ?? null} />
                                        <BropenParticipantRow name={pB.name} email={pB.email} phone={pB.phone} registered={!!profileB} handicap={profileB ? (event.handicaps[profileB.uid] ?? null) : null} canEdit={canEdit} eventId={event.eventId} profileUid={profileB?.uid ?? null} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Info tab */}
                {activeTab === 'info' && <EventInfoPanel />}

            </div>
        </div>
    )
}

function MapLink({ address, label }: { address: string; label: string }) {
    const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`
    return (
        <a
            style={{ marginLeft: "5px" }}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand bg-brand/10 hover:bg-brand/20 px-2 py-0.5 rounded-full transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
            </svg>
            {label}
        </a>
    )
}

function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`bg-card-bg border border-card-border rounded-xl overflow-hidden ${className}`}>
            {children}
        </div>
    )
}

function SectionHeader({ children }: { children: ReactNode }) {
    return (
        <div className="bg-brand px-4 py-2.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">{children}</h3>
        </div>
    )
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-brand">
                    <span className="text-brand/40 mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    )
}

const TEE_TIMES = [
    {
        day: 'Friday, August 21st',
        course: 'Avalon Field Club At New Castle',
        times: '1:00 – 1:50 PM',
        address: '511 Country Clb Dr, New Castle, PA 16105',
    },
    {
        day: 'Saturday, August 22nd',
        course: 'Avalon Lakes Golf Club',
        times: '10:40 – 11:30 AM',
        address: '1 American Way, Warren, OH 44484',
    },
    {
        day: 'Sunday, August 23rd',
        course: 'Squaw Creek Country Club',
        times: '9:10 – 10:00 AM',
        address: '761 Youngstown Kingsville Rd SE #8615, Vienna, OH 44473',
    },
]

function EventInfoPanel() {
    return (
        <div className="flex flex-col gap-4 pb-4">

            {/* Hero */}
            <div className="bg-brand rounded-xl px-5 pt-5 pb-6 flex flex-col gap-2 text-white">
                <h1 className="text-2xl font-extrabold tracking-tight leading-tight">US BROPEN 2026</h1>
                <p className="text-sm text-white/80 leading-relaxed mt-1">
                    It's about to go down!  The bros are descending upon Avalon Lakes for the annual boys golf trip. This year we have an unprecedented 24 golfers participating. You better buckle the fuck up.
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs font-semibold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">Aug 21–23, 2026</span>
                    <span className="text-xs font-semibold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">3 Rounds</span>
                </div>
            </div>

            {/* Stay & Play Package */}
            <SectionCard>
                <SectionHeader>Stay &amp; Play Package</SectionHeader>
                <div className="px-4 py-3 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-brand">The Grand Resort at Avalon Lakes</p>
                            <p className="text-xs text-muted">1 American Way, Warren, OH 44484</p>
                            <div className="mt-1">
                                <MapLink address="1 American Way, Warren, OH 44484" label="Get Directions" />
                            </div>
                        </div>
                        <img src="/images/events/USBROPEN_Avalon.svg" alt="Avalon" className="h-14 w-auto shrink-0" />
                    </div>
                    <div className="border-t border-card-border pt-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Package Includes</p>
                        <BulletList items={[
                            '3 Rounds of Golf',
                            '2 Nights Accommodation',
                            'Complimentary Shuttle Service',
                            'Unlimited Practice Facilities',
                            'Access to all Country Club Amenities',
                            'All taxes and associated fees',
                        ]} />
                    </div>
                </div>
            </SectionCard>

            {/* Payment
            <SectionCard>
                <SectionHeader>Payment</SectionHeader>
                <div className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <div>
                            <p className="text-xs font-bold text-amber-700">Due Date: July 22nd</p>
                            <p className="text-xs text-amber-600">Full package payment due from each guest (30 days prior)</p>
                        </div>
                    </div>
                </div>
            </SectionCard> */}

            {/* Hotel Info */}
            <SectionCard>
                <SectionHeader>Hotel Details</SectionHeader>
                <div className="px-4 py-3 flex flex-col gap-2.5">
                    {[
                        { label: 'Check-in', value: '4 PM' },
                        { label: 'Check-out', value: '11 AM' },
                        { label: 'Breakfast (The Atrium)', value: '6-11 AM' },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-brand">{label}</span>
                            </div>
                            <span className="text-sm font-medium text-brand">{value}</span>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Tee Times / Itinerary
            <SectionCard>
                <SectionHeader>Itinerary &amp; Tee Times</SectionHeader>
                <div className="divide-y divide-card-border">
                    {TEE_TIMES.map(({ day, course, times, address }) => (
                        <div key={day} className="px-4 py-3 flex flex-col gap-0.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted">{day}</p>
                            <p className="text-sm font-semibold text-brand">{course}</p>
                            <div className="flex items-center justify-between mt-0.5">
                                <span className="text-sm text-brand/70">{times}</span>
                                <MapLink address={address} label="Map" />
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard> */}

        </div>
    )
}

function BropenParticipantRow({ name, email, phone, registered, handicap, canEdit, eventId, profileUid }: {
    name: string; email: string; phone: string
    registered: boolean; handicap: number | null
    canEdit: boolean; eventId: string; profileUid: string | null
}) {
    const initials = getInitials(name)
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(String(handicap ?? ''))
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        if (!profileUid || !eventId) return
        const parsed = parseFloat(value)
        if (isNaN(parsed)) return
        setSaving(true)
        await eventService.updateParticipantHandicap(eventId, profileUid, parsed)
        setSaving(false)
        setEditing(false)
    }

    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-brand">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand truncate">{name}</p>
                <div className="h-5 flex items-center">
                {registered && (
                    <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        {editing ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    className="w-14 text-xs text-brand border border-card-border rounded px-1.5 py-0 leading-5 h-5 focus:outline-none focus:border-brand"
                                    autoFocus
                                />
                                <button onClick={handleSave} disabled={saving} className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50 leading-5">
                                    {saving ? '…' : 'Save'}
                                </button>
                                <button onClick={() => setEditing(false)} className="text-xs text-muted hover:text-brand leading-5">✕</button>
                            </div>
                        ) : (
                            <>
                                {handicap !== null && <span className="text-xs text-muted">HCP {handicap}</span>}
                                {canEdit && (
                                    <button onClick={() => setEditing(true)} className="text-xs text-brand/50 hover:text-brand transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
                </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
                <a
                    href={`tel:${phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-1 text-xs font-medium text-brand bg-brand/10 hover:bg-brand/20 px-2.5 py-1 rounded-full transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {formatPhone(phone)}
                </a>
                <a href={`mailto:${email}`} className="text-xs text-muted hover:text-brand truncate max-w-[160px]">{email.toLowerCase()}</a>
            </div>
        </div>
    )
}
