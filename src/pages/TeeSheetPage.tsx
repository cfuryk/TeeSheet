import { Link } from 'react-router-dom'
import { useTeeSheetCombined } from '@/hooks/useTeeSheetCombined'
import { useAuth } from '@/hooks/useAuth'
import { RoundCard } from '@/components/round/RoundCard'
import { EventCard } from '@/components/round/EventCard'
import { Spinner } from '@/components/ui'

export function TeeSheetPage() {
  const { rounds, events, loading: listLoading } = useTeeSheetCombined()
  const { currentUser, loading: authLoading } = useAuth()
  const uid = currentUser?.uid ?? ''

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
          to="/rounds/new"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-semibold transition-colors"
        >
          + Create Round
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
          {rounds.map((r) => (
            <RoundCard key={r.roundId} round={r} currentUserId={uid} showStatus />
          ))}
        </div>
      )}
    </div>
  )
}
