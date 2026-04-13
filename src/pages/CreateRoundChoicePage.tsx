import { useNavigate } from 'react-router-dom'

export function CreateRoundChoicePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-brand">Create Round</h2>
      <p className="text-muted text-sm">How would you like to record this round?</p>

      <button
        type="button"
        onClick={() => navigate('/rounds/new/full')}
        className="w-full bg-brand hover:bg-brand-hover text-white rounded-xl px-5 py-4 text-left transition-colors"
      >
        <p className="font-bold text-lg mb-1">Full Round</p>
        <p className="text-sm text-white/70">
          Create a round on the TeeSheet, invite players, track live scoring hole-by-hole, and sign off on completion.
        </p>
      </button>

      <button
        type="button"
        onClick={() => navigate('/rounds/new/score')}
        className="w-full bg-brand hover:bg-brand-hover text-white rounded-xl px-5 py-4 text-left transition-colors"
      >
        <p className="font-bold text-lg mb-1">Enter Score</p>
        <p className="text-sm text-white/70">
          Quickly log a completed round by entering your total score. Great for rounds already played.
        </p>
      </button>
    </div>
  )
}
