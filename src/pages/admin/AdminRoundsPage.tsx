import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { roundService } from '@/services/roundService'
import { RoundCard } from '@/components/round/RoundCard'
import { Spinner, Card, Button } from '@/components/ui'
import type { Round } from '@/types'

export function AdminRoundsPage() {
  const navigate = useNavigate()
  const [rounds, setRounds] = useState<Round[]>([])
  const [seededRounds, setSeededRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [seedOpen, setSeedOpen] = useState(true)

  useEffect(() => {
    roundService.getSeededRounds().then(setSeededRounds)
    return roundService.onActiveRoundsSnapshot((r) => {
      setRounds(r)
      setLoading(false)
    })
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Admin Rounds</h2>
        <Button variant="primary" size="sm" onClick={() => navigate('/admin')}>Back</Button>
      </div>

      {seededRounds.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setSeedOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors text-left"
          >
            <span>{seedOpen ? '▾' : '▸'}</span>
            Seed Rounds ({seededRounds.length})
          </button>
          {seedOpen && (
            <div className="flex flex-col gap-3">
              {seededRounds.map((r) => (
                <RoundCard key={r.roundId} round={r} currentUserId="" showStatus />
              ))}
            </div>
          )}
        </div>
      )}

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
