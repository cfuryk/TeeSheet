import { useState } from 'react'
import { Button, Input } from '@/components/ui'

interface Props {
  par: number
  currentScore: number | null
  onSelect: (score: number) => void
}

export function ScoreSelector({ par, currentScore, onSelect }: Props) {
  const [showManual, setShowManual] = useState(false)
  const [manualVal, setManualVal] = useState('')
  const quickOptions = [par - 1, par, par + 1, par + 2]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-400 text-center">Select your score</p>
      <div className="grid grid-cols-4 gap-2">
        {quickOptions.map((score) => {
          const diff = score - par
          const label = diff === 0 ? 'Par' : diff === -1 ? 'Birdie' : diff === -2 ? 'Eagle' : diff === 1 ? 'Bogey' : `+${diff}`
          return (
            <button
              key={score}
              onClick={() => { onSelect(score); setShowManual(false) }}
              className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all font-bold text-lg ${
                currentScore === score
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-600 bg-gray-700 text-gray-200 hover:border-green-500'
              }`}
            >
              {score}
              <span className="text-xs font-normal mt-0.5 opacity-75">{label}</span>
            </button>
          )
        })}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setShowManual(!showManual)}>
        {showManual ? 'Hide' : 'Other score'}
      </Button>
      {showManual && (
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            max={15}
            value={manualVal}
            onChange={(e) => setManualVal(e.target.value)}
            placeholder="Enter score"
            className="flex-1"
          />
          <Button
            onClick={() => {
              const v = parseInt(manualVal)
              if (!isNaN(v) && v > 0) { onSelect(v); setShowManual(false); setManualVal('') }
            }}
          >
            OK
          </Button>
        </div>
      )}
    </div>
  )
}
