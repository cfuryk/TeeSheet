import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTeeSheetCombined } from '@/hooks/useTeeSheetCombined'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import { RoundCard } from '@/components/round/RoundCard'
import { EventCard } from '@/components/round/EventCard'
import { Spinner } from '@/components/ui'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Group, UserProfile } from '@/types'

export function TeeSheetPage() {
  const { rounds, events, loading: listLoading } = useTeeSheetCombined()
  const { currentUser, loading: authLoading } = useAuth()
  const uid = currentUser?.uid ?? ''

  // groupId lookup for standalone rounds the user has joined
  const [groupLinks, setGroupLinks] = useState<Record<string, string>>({})
  const [hostProfiles, setHostProfiles] = useState<Record<string, UserProfile>>({})

  useEffect(() => {
    if (rounds.length === 0) return
    const creatorIds = [...new Set(rounds.map((r) => r.createdBy))]
    Promise.all(creatorIds.map((id) => userService.getProfile(id).then((p) => ({ id, p }))))
      .then((results) => {
        const map: Record<string, UserProfile> = {}
        for (const { id, p } of results) { if (p) map[id] = p }
        setHostProfiles(map)
      })
  }, [rounds])

  useEffect(() => {
    if (!uid || rounds.length === 0) return
    const standaloneJoined = rounds.filter((r) => !r.eventId && r.memberIds?.includes(uid))
    if (standaloneJoined.length === 0) return

    Promise.all(
      standaloneJoined.map(async (r) => {
        const snap = await getDocs(collection(db, 'rounds', r.roundId, 'groups'))
        const groups = snap.docs.map((d) => ({ groupId: d.id, ...d.data() } as Group))
        const myGroup = groups.find((g) => g.golferIds.includes(uid))
        return myGroup ? { roundId: r.roundId, groupId: myGroup.groupId } : null
      })
    ).then((results) => {
      const map: Record<string, string> = {}
      for (const res of results) {
        if (res) map[res.roundId] = res.groupId
      }
      setGroupLinks(map)
    })
  }, [uid, rounds])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 relative overflow-hidden">
        <h1 className="text-2xl font-black text-white text-center relative z-10">Welcome to the Teesheet</h1>
        <div className="flex gap-3 w-full relative z-10">
          <Link
            to="/register"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-semibold transition-colors"
          >
            Register Free
          </Link>
          <Link
            to="/login"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
        <img
          src="/src/images/Icon.svg"
          alt=""
          aria-hidden="true"
          className="w-[360px] opacity-20 pointer-events-none select-none"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* CTAs */}
      <div className="flex gap-3">
        <Link
          to="/rounds/new/full"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-semibold transition-colors"
        >
          Start Round
        </Link>
        <Link
          to="/rounds/new/score"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-semibold transition-colors"
        >
          Enter Score
        </Link>
      </div>

      {/* List */}
      <h2 className="text-2xl font-black text-white">The TeeSheet</h2>
      {listLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : rounds.length === 0 && events.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-medium text-gray-400">No upcoming rounds or events</p>
          <p className="text-sm text-gray-500 mt-1">Create one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <EventCard key={e.eventId} event={e} currentUserId={uid} />
          ))}
          {rounds.map((r) => {
            const groupId = groupLinks[r.roundId]
            const linkTo = !r.eventId && groupId
              ? `/rounds/${r.roundId}/groups/${groupId}`
              : undefined
            return (
              <RoundCard
                key={r.roundId}
                round={r}
                currentUserId={uid}
                showStatus
                linkTo={linkTo}
                hostName={r.createdBy === uid ? 'You' : (hostProfiles[r.createdBy]?.displayName ?? '…')}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
