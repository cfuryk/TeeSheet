import { useState, useRef, useEffect } from 'react'
import type React from 'react'
import type { Hole } from '@/types'

interface Props {
  hole: Hole
  currentScore: number | null
  onSelect: (score: number) => void
  strokes?: number
  navigation: React.ReactNode
}

export function HoleInfo({ hole, currentScore, onSelect, strokes = 0, navigation }: Props) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const displayed = currentScore ?? hole.par

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select()
    }
  }, [editing])

  function scoreBadgeClass(score: number): string {
    const diff = score - hole.par
    if (diff <= -2) return 'text-red-400 ring-2 ring-red-400 ring-offset-2 ring-offset-gray-800 outline outline-2 outline-red-400 outline-offset-[-6px] rounded-full'
    if (diff === -1) return 'text-red-400 ring-2 ring-red-400 rounded-full'
    if (diff === 0) return 'text-white'
    if (diff === 1) return 'text-blue-400 ring-2 ring-blue-400'
    return 'text-blue-400 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-800 outline outline-2 outline-blue-400 outline-offset-[-6px]'
  }

  function adjust(delta: number) {
    const next = Math.max(1, displayed + delta)
    onSelect(next)
  }

  function commitInput() {
    const v = parseInt(inputVal)
    if (!isNaN(v) && v > 0) onSelect(v)
    setEditing(false)
    setInputVal('')
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
      {/* Hole stats row */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Hole</p>
          <p className="text-2xl font-black text-green-400">{hole.number}</p>
        </div>
        <div className="flex gap-5 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Par</p>
            <p className="text-2xl font-bold text-white">{hole.par}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Yards</p>
            <p className="text-2xl font-bold text-white">{hole.yardage}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">HCP</p>
            <p className="text-2xl font-bold text-white">{hole.handicap}</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700 mb-3" />

      {/* Score stepper */}
      <div className="flex items-center justify-between h-12">
        <button
          type="button"
          onClick={() => adjust(-1)}
          className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-xl font-bold flex items-center justify-center transition-colors"
        >
          −
        </button>

        <div className="flex items-center justify-center w-12 h-12">
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={20}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={commitInput}
              onKeyDown={(e) => { if (e.key === 'Enter') commitInput() }}
              className="w-12 h-12 text-center text-3xl font-black bg-transparent text-white border-b-2 border-green-400 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setEditing(true); setInputVal(String(displayed)) }}
              className={`w-12 h-12 inline-flex items-center justify-center text-3xl font-black transition-all ${
                currentScore !== null ? scoreBadgeClass(currentScore) : 'text-gray-600'
              }`}
            >
              {displayed}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => adjust(1)}
          className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-xl font-bold flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>

      {strokes > 0 && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-green-400">
          <span className="flex gap-0.5">
            {Array.from({ length: strokes }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            ))}
          </span>
          <span>{strokes} stroke{strokes > 1 ? 's' : ''} on this hole</span>
        </div>
      )}

      <div className="border-t border-gray-700 mt-4 pt-3">
        {navigation}
      </div>
    </div>
  )
}
