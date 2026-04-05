import { useState } from 'react'
import type { Score, Hole } from '@/types'
import { formatVsPar, calculateTotalVsPar, calculateTotalNetVsPar } from '@/lib/scoring'

interface Props {
  scores: Score[]
  holes: Hole[]
  isNet: boolean
  currentHole?: number
}

export function GroupScoreSummary({ scores, holes, isNet, currentHole }: Props) {
  const [open, setOpen] = useState(false)
  if (scores.length === 0) return null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-750 transition-colors"
      >
        <span className="text-sm font-semibold text-white">Group Scores</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-3 flex flex-col gap-2">
          {scores.map((sc) => {
          const holesPlayed = sc.scores.length
          const gross = sc.scores.reduce((s, h) => s + h.grossScore, 0)
          const net = sc.scores.reduce((s, h) => s + h.netScore, 0)
          const vsParGross = calculateTotalVsPar(sc.scores, holes)
          const vsParNet = calculateTotalNetVsPar(sc.scores, holes)
          const strokesOnCurrentHole = currentHole !== undefined
            ? (sc.strokeAllocation[currentHole - 1] ?? 0)
            : 0

          return (
            <div key={sc.golferId} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm text-white">{sc.golferName}</span>
                {isNet && strokesOnCurrentHole > 0 && (
                  <span className="flex gap-0.5">
                    {Array.from({ length: strokesOnCurrentHole }).map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    ))}
                  </span>
                )}
                <span className="text-xs text-gray-500">({holesPlayed}/18)</span>
              </div>
              <div className="flex gap-3 items-center">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Gross</p>
                  <p className="font-bold text-white">{holesPlayed > 0 ? gross : '-'}</p>
                  {holesPlayed > 0 && <p className="text-xs text-gray-500">{formatVsPar(vsParGross)}</p>}
                </div>
                {isNet && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Net</p>
                    <p className="font-bold text-green-400">{holesPlayed > 0 ? net : '-'}</p>
                    {holesPlayed > 0 && <p className="text-xs text-gray-500">{formatVsPar(vsParNet)}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        </div>
      )}
    </div>
  )
}
