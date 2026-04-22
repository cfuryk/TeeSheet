import { useState, useRef, useEffect } from 'react'
import type React from 'react'
import type { Hole } from '@/types'
import { formatHandicap } from '@/lib/formatters'

interface Props {
  hole: Hole
  currentScore: number | null
  onSelect: (score: number) => void
  strokes?: number
  navigation: React.ReactNode
  golferName?: string
  courseHandicap?: number
  vsPar?: number | null
  holesPlayed?: number
  totalGross?: number | null
  isLocked?: boolean
}

export function HoleInfo({ hole, currentScore, onSelect, navigation, golferName, courseHandicap, vsPar, holesPlayed, totalGross, isLocked }: Props) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select()
    }
  }, [editing])

  function scoreBadgeClass(score: number): string {
    const diff = score - hole.par
    if (diff <= -2) return 'text-danger ring-2 ring-danger ring-offset-[3px] ring-offset-card-bg outline outline-2 outline-danger outline-offset-[-3px] rounded-full'
    if (diff === -1) return 'text-danger ring-2 ring-danger rounded-full'
    if (diff === 0) return 'text-brand'
    if (diff === 1) return 'text-[#3A6280] ring-2 ring-[#3A6280]'
    return 'text-[#3A6280] ring-2 ring-[#3A6280] ring-offset-[3px] ring-offset-card-bg outline outline-2 outline-[#3A6280] outline-offset-[-3px]'
  }

  function vsParLabel(v: number) {
    if (v === 0) return 'E'
    return v > 0 ? `+${v}` : `${v}`
  }

  function thruLabel() {
    if (holesPlayed === undefined) return '-'
    if (holesPlayed === 18 && isLocked) return 'F'
    return `${holesPlayed}`
  }

  function adjust(delta: number) {
    if (currentScore === null) {
      onSelect(hole.par)
    } else {
      onSelect(Math.max(1, currentScore + delta))
    }
  }

  function commitInput() {
    const v = parseInt(inputVal)
    if (!isNaN(v) && v > 0) onSelect(v)
    setEditing(false)
    setInputVal('')
  }

  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      {/* Player stat header */}
      {golferName && (
        <div className="bg-brand px-4 py-2 mb-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-white leading-tight">{golferName}</p>
              {courseHandicap !== undefined && (
                <p className="text-xs text-white/60">Handicap: {formatHandicap(courseHandicap)}</p>
              )}
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wide">Round</p>
                <p className={`text-sm font-bold ${vsPar !== null && vsPar !== undefined ? (vsPar < 0 ? 'text-red-400' : vsPar > 0 ? 'text-[#7BAFD4]' : 'text-white') : 'text-white/60'}`}>
                  {vsPar !== null && vsPar !== undefined ? vsParLabel(vsPar) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wide">Thru</p>
                <p className="text-sm font-bold text-white">{thruLabel()}</p>
              </div>
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wide">Total</p>
                <p className="text-sm font-bold text-white">{totalGross ?? '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-2">
      {/* Hole stats row */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-center">
          <p className="text-xs text-muted uppercase tracking-wide">Hole</p>
          <p className="text-xl font-black text-brand">{hole.number}</p>
        </div>
        <div className="flex gap-5 text-center">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Par</p>
            <p className="text-xl font-bold text-brand">{hole.par}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Yards</p>
            <p className="text-xl font-bold text-brand">{hole.yardage}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">HCP</p>
            <p className="text-xl font-bold text-brand">{hole.handicap}</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-card-border mb-2" />

      {/* Score stepper */}
      <div className="flex items-center justify-between h-10">
        <button
          type="button"
          onClick={() => adjust(-1)}
          className="w-9 h-9 rounded-full bg-btn-secondary text-brand text-xl font-bold flex items-center justify-center transition-colors hover:bg-[#3A6280] hover:text-white"
        >
          −
        </button>

        <div className="flex items-center justify-center w-10 h-10">
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
              className="w-10 h-10 text-center text-2xl font-black bg-transparent text-brand border-b-2 border-brand outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setEditing(true); setInputVal(currentScore !== null ? String(currentScore) : '') }}
              className={`w-10 h-10 inline-flex items-center justify-center text-2xl font-black transition-all ${
                currentScore !== null ? scoreBadgeClass(currentScore) : 'text-muted'
              }`}
            >
              {currentScore !== null ? currentScore : '-'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => adjust(1)}
          className="w-9 h-9 rounded-full bg-btn-secondary text-brand text-xl font-bold flex items-center justify-center transition-colors hover:bg-[#3A6280] hover:text-white"
        >
          +
        </button>
      </div>

      <div className="border-t border-card-border mt-3 pt-2">
        {navigation}
      </div>
      </div>
    </div>
  )
}
