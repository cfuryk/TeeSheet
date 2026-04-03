import { useAuth } from '@/hooks/useAuth'
import { useMyRounds } from '@/hooks/useMyRounds'
import { RoundCard } from '@/components/round/RoundCard'
import { Spinner, Card } from '@/components/ui'

export function MyRoundsPage() {
  const { currentUser } = useAuth()
  const { rounds, loading } = useMyRounds(currentUser?.uid ?? '')
  const uid = currentUser?.uid ?? ''

  const myRounds = rounds.filter((r) => r.createdBy === uid)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">My Rounds</h1>

      {loading ? (
        <div className="flex items-center justify-center pt-8">
          <Spinner />
        </div>
      ) : myRounds.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-400">You haven't created any rounds yet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {myRounds.map((r) => (
            <RoundCard key={r.roundId} round={r} currentUserId={uid} showStatus />
          ))}
        </div>
      )}
    </div>
  )
}
