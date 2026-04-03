import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { roundService } from '@/services/roundService'
import { RoundCard } from '@/components/round/RoundCard'
import { Spinner, Card, Button } from '@/components/ui'
import type { Round } from '@/types'

export function AdminRoundsPage() {
  const navigate = useNavigate()
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return roundService.onActiveRoundsSnapshot((r) => {
      setRounds(r)
      setLoading(false)
    })
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Admin Rounds</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>Back</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : rounds.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-400">No active or pending rounds.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rounds.map((r) => (
            <RoundCard key={r.roundId} round={r} currentUserId="" showStatus />
          ))}
        </div>
      )}
    </div>
  )
}
