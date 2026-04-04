import { useState } from 'react'
import type React from 'react'
import type { Score, Hole } from '@/types'
import { Button, Badge } from '@/components/ui'
import { formatVsPar, calculateTotalVsPar, scoreVsPar } from '@/lib/scoring'
import { scoreService } from '@/services/scoreService'

interface Props {
  scores: Score[]
  holes: Hole[]
  currentUserId: string
  roundId: string
  groupId: string
  onSign: (uid: string) => void
  signing: string | null
  isNet?: boolean
}

export function SigningGrid({ scores, holes, currentUserId, roundId, groupId, onSign, signing, isNet = false }: Props) {
  const sorted = [...holes].sort((a, b) => a.number - b.number)
  const totalPar = sorted.reduce((s, h) => s + h.par, 0)

  return (
    <div className="flex flex-col gap-4">
      {scores.map((sc) => {
        const totalVsPar = calculateTotalVsPar(sc.scores, holes)

        return (
          <div key={sc.golferId} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            {/* Golfer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold text-white">{sc.golferName}</span>
              <div className="flex items-center gap-3">
                {sc.totalGross !== null && sc.totalGross !== undefined && totalVsPar !== null && (
                  <span className="text-sm font-bold text-gray-400">
                    {formatVsPar(totalVsPar)}
                    <span className="text-gray-600 mx-1">·</span>
                    <span className="text-white">{sc.totalGross}</span>
                  </span>
                )}
                {sc.isLocked
                  ? <Badge label="Signed ✓" variant="green" />
                  : sc.golferId === currentUserId
                    ? null
                    : <span className="text-xs text-gray-500">Awaiting sign</span>
                }
              </div>
            </div>

            {/* Hole rows */}
            <div className="divide-y divide-gray-700/50">
              {sorted.map((h) => {
                const s = sc.scores.find((x) => x.hole === h.number)
                const vp = s ? scoreVsPar(s.grossScore, h.par) : null
                const canEdit = !sc.isLocked && sc.golferId === currentUserId
                return (
                  <HoleRow
                    key={h.number}
                    hole={h}
                    score={s?.grossScore ?? null}
                    vsPar={vp}
                    canEdit={canEdit}
                    strokeAllocation={sc.strokeAllocation}
                    allScores={sc.scores}
                    roundId={roundId}
                    groupId={groupId}
                    uid={sc.golferId}
                    isNet={isNet}
                  />
                )
              })}
            </div>

            {/* Total row */}
            <div className="flex items-center px-4 py-2 border-t border-gray-700 bg-gray-700/30">
              <span className="text-sm font-semibold text-gray-300">Total</span>
              <span className="ml-auto text-sm font-bold text-gray-400 mr-4">Par {totalPar}</span>
              <span className="text-sm font-bold text-white">{sc.totalGross ?? '-'}</span>
            </div>

            {/* Sign button */}
            {!sc.isLocked && sc.golferId === currentUserId && (
              <div className="px-4 py-3 border-t border-gray-700">
                <Button
                  loading={signing === sc.golferId}
                  onClick={() => onSign(sc.golferId)}
                  className="w-full"
                >
                  Sign My Card
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HoleRow({
  hole,
  score,
  vsPar,
  canEdit,
  strokeAllocation,
  allScores,
  roundId,
  groupId,
  uid,
  isNet,
}: {
  hole: Hole
  score: number | null
  vsPar: number | null
  canEdit: boolean
  strokeAllocation: number[]
  allScores: Score['scores']
  roundId: string
  groupId: string
  uid: string
  isNet: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)

  const holeIndex = hole.number - 1
  const strokes = strokeAllocation[holeIndex] ?? 0

  function startEditing() {
    if (!canEdit) return
    setInputVal(score !== null ? String(score) : '')
    setEditing(true)
  }

  async function handleCommit() {
    const parsed = parseInt(inputVal)
    if (!isNaN(parsed) && parsed > 0) {
      setSaving(true)
      const netScore = parsed - strokes
      await scoreService.updateHoleScore(roundId, groupId, uid, { hole: hole.number, grossScore: parsed, netScore }, allScores)
      setSaving(false)
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCommit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div
      className={`flex flex-col divide-y divide-gray-700/30 ${canEdit && !editing ? 'cursor-pointer active:bg-gray-700/40' : ''}`}
      onClick={() => !editing && startEditing()}
    >
      <div className="relative flex items-center px-4 py-2 text-sm">
        <span className="w-16 text-gray-400">Hole {hole.number}</span>
        <span className="w-12 text-gray-500 text-center">Par {hole.par}</span>
        {isNet && strokes > 0 && (
          <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-green-400" />
        )}
        {saving ? (
          <span className="ml-auto text-xs text-gray-500">Saving…</span>
        ) : (
          <ScoreBadge score={score} vsPar={vsPar} />
        )}
      </div>

      {editing && (
        <div className="px-4 py-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="number"
            min={1}
            max={20}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full text-center bg-gray-700 border border-green-500 rounded-lg text-white font-mono font-semibold py-2 text-lg focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCommit}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              OK
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreBadge({ score, vsPar, noMargin = false }: { score: number | null; vsPar: number | null; noMargin?: boolean }) {
  const margin = noMargin ? '' : 'ml-auto'
  if (score === null || vsPar === null) {
    return <span className={`${margin} font-mono text-gray-600`}>-</span>
  }

  // Eagle or better: red, double circle
  if (vsPar <= -2) {
    return (
      <span className={`${margin} inline-flex items-center justify-center w-8 h-8 font-mono font-semibold text-red-400 rounded-full ring-2 ring-red-400 ring-offset-2 ring-offset-gray-800 outline outline-2 outline-red-400 outline-offset-[-6px]`}>
        {score}
      </span>
    )
  }
  // Birdie: red, single circle
  if (vsPar === -1) {
    return (
      <span className={`${margin} inline-flex items-center justify-center w-7 h-7 font-mono font-semibold text-red-400 rounded-full ring-2 ring-red-400`}>
        {score}
      </span>
    )
  }
  // Par: plain white
  if (vsPar === 0) {
    return <span className={`${margin} inline-flex items-center justify-center w-7 h-7 font-mono font-semibold text-gray-200`}>{score}</span>
  }
  // Bogey: blue, single square
  if (vsPar === 1) {
    return (
      <span className={`${margin} inline-flex items-center justify-center w-7 h-7 font-mono font-semibold text-blue-400 ring-2 ring-blue-400`}>
        {score}
      </span>
    )
  }
  // Double bogey or worse: blue, double square
  return (
    <span className={`${margin} inline-flex items-center justify-center w-8 h-8 font-mono font-semibold text-blue-400 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-800 outline outline-2 outline-blue-400 outline-offset-[-6px]`}>
      {score}
    </span>
  )
}
