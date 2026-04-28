import { useState, useRef } from 'react'
import { sideBetService } from '@/services/sideBetService'
import type { SideBet } from '@/types'

interface Props {
  bet: SideBet
  currentHole: number
  uid: string
  mySide: 'A' | 'B'
}

export function HammerBetBar({ bet, currentHole, uid: _uid, mySide }: Props) {
  const [busy, setBusy] = useState(false)
  const [animating, setAnimating] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [hammerStyle, setHammerStyle] = useState<React.CSSProperties>({})

  const cfg = bet.hammerConfig
  if (!cfg) return null

  const roundId = bet.roundId
  const betId = bet.sideBetId
  const holeAlreadyRecorded = cfg.holeResults.some((r) => r.hole === currentHole)
  const opponentSide: 'A' | 'B' = mySide === 'A' ? 'B' : 'A'

  const pendingHammer = cfg.hammerHolder !== null
  const iThrew = cfg.hammerHolder === mySide
  const theyThrew = cfg.hammerHolder === opponentSide

  function canThrow(): boolean {
    if (holeAlreadyRecorded || pendingHammer) return false
    if (cfg!.lastThrowerSide !== null) return mySide === cfg!.lastThrowerSide
    if (cfg!.firstRule === 'open') return true
    return mySide === 'A'
  }

  const myTurn = canThrow()
  const stakeLabel = `$${cfg.currentHoleStake.toFixed(2)}`

  async function handleThrow() {
    if (busy || animating || !rowRef.current || !btnRef.current) return

    // Calculate start position (button center) and end position (left side of row)
    const rowRect = rowRef.current.getBoundingClientRect()
    const btnRect = btnRef.current.getBoundingClientRect()
    const startX = btnRect.left + btnRect.width / 2 - rowRect.left
    const startY = btnRect.top + btnRect.height / 2 - rowRect.top
    const endX = 16 // land near the left info area

    // Place hammer at button, no transition yet
    setHammerStyle({
      position: 'absolute',
      left: startX,
      top: startY,
      transform: 'translate(-50%, -50%) rotate(0deg)',
      fontSize: '1.2rem',
      pointerEvents: 'none',
      transition: 'none',
      opacity: 1,
    })
    setAnimating(true)

    // Next frame: animate to left
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setHammerStyle({
          position: 'absolute',
          left: endX,
          top: startY,
          transform: 'translate(-50%, -50%) rotate(-540deg)',
          fontSize: '1.2rem',
          pointerEvents: 'none',
          transition: 'left 0.45s ease-in, transform 0.45s ease-in',
          opacity: 1,
        })
      })
    })

    // After animation completes, fire the write and clean up
    await new Promise((r) => setTimeout(r, 450))
    setAnimating(false)
    setHammerStyle({})
    setBusy(true)
    try {
      await sideBetService.throwHammer(roundId, betId, mySide, cfg!.currentHoleStake, cfg!.currentHoleHammers)
    } finally {
      setBusy(false)
    }
  }

  async function handleAccept() {
    setBusy(true)
    try {
      await sideBetService.acceptHammer(roundId, betId, mySide)
    } finally {
      setBusy(false)
    }
  }

  async function handleFold() {
    setBusy(true)
    try {
      await sideBetService.foldHammer(roundId, betId, mySide, currentHole, cfg!.currentHoleStake, cfg!.currentHoleHammers, cfg!.baseStake)
    } finally {
      setBusy(false)
    }
  }

  // Determine which action state is active
  const showRecorded = holeAlreadyRecorded
  const showWaiting = !holeAlreadyRecorded && iThrew
  const showAcceptFold = !holeAlreadyRecorded && theyThrew
  const showThrow = !holeAlreadyRecorded && !pendingHammer

  return (
    <div ref={rowRef} className="relative flex items-center gap-2 px-1 h-9">
      {/* Flying hammer — absolutely positioned, only visible during animation */}
      {animating && <div style={hammerStyle}>🔨</div>}

      {/* Left: hammer icon + stake */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-blue-600 shrink-0">🔨</span>
        <span className="text-xs text-muted shrink-0">{stakeLabel}/hole</span>
      </div>

      {/* Right: action area — fixed size, states overlap via absolute positioning */}
      <div className="relative ml-auto h-7 w-48 shrink-0">

        {/* Recorded */}
        <span className={`absolute inset-0 flex items-center justify-end text-xs text-muted ${showRecorded ? '' : 'invisible'}`}>
          Hole recorded
        </span>

        {/* Waiting */}
        <span className={`absolute inset-0 flex items-center justify-end text-xs text-muted animate-pulse ${showWaiting ? '' : 'invisible'}`}>
          Waiting…
        </span>

        {/* Hammer incoming — accept/concede */}
        <div className={`absolute inset-0 flex items-center justify-end gap-1.5 ${showAcceptFold ? '' : 'invisible'}`}>
          <span className="text-xs font-semibold text-blue-600 animate-pulse">
            🔨 ${cfg.currentHoleStake.toFixed(2)}!
          </span>
          <button
            type="button"
            disabled={busy || !showAcceptFold}
            onClick={handleAccept}
            className="h-7 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-50 transition-colors inline-flex items-center"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy || !showAcceptFold}
            onClick={handleFold}
            className="h-7 px-3 rounded-lg bg-danger hover:bg-danger/80 text-white text-xs font-bold disabled:opacity-50 transition-colors inline-flex items-center"
          >
            Concede
          </button>
        </div>

        {/* Throw */}
        <div className={`absolute inset-0 flex items-center justify-end ${showThrow ? '' : 'invisible'}`}>
          <button
            ref={btnRef}
            type="button"
            disabled={busy || animating || !myTurn}
            onClick={handleThrow}
            className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40 transition-colors inline-flex items-center gap-1"
          >
            Throw 🔨
          </button>
        </div>

      </div>
    </div>
  )
}
