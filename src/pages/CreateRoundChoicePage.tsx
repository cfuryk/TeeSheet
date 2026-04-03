import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui'

export function CreateRoundChoicePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white">Create Round</h2>
      <p className="text-gray-400 text-sm">How would you like to record this round?</p>

      <button type="button" onClick={() => navigate('/rounds/new/full')} className="w-full text-left">
        <Card className="p-5 hover:border-green-600 transition-colors">
          <p className="font-bold text-white text-lg mb-1">Full Round</p>
          <p className="text-sm text-gray-400">
            Create a round on the TeeSheet, invite players, track live scoring hole-by-hole, and sign off on completion.
          </p>
        </Card>
      </button>

      <button type="button" onClick={() => navigate('/rounds/new/score')} className="w-full text-left">
        <Card className="p-5 hover:border-green-600 transition-colors">
          <p className="font-bold text-white text-lg mb-1">Enter Score</p>
          <p className="text-sm text-gray-400">
            Quickly log a completed round by entering your total score. Great for rounds already played.
          </p>
        </Card>
      </button>
    </div>
  )
}
