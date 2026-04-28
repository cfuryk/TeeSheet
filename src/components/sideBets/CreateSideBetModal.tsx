import { useState, useEffect, useRef } from 'react'
import { sideBetService } from '@/services/sideBetService'
import { Input } from '@/components/ui'
import type { Round, UserProfile, SideBetType, HammerFormat, HammerFirstRule, MatchFormat } from '@/types'

type BetCategory = 'STROKE' | 'NASSAU' | 'MATCH' | 'HAMMER' | 'SKINS'

const BET_CATEGORIES: { value: BetCategory; label: string; description: string }[] = [
  { value: 'STROKE', label: 'Stroke', description: 'Lowest total score wins' },
  { value: 'NASSAU', label: 'Nassau', description: 'Front 9, Back 9, and Total' },
  { value: 'MATCH', label: 'Match Play', description: 'Hole-by-hole match format' },
  { value: 'HAMMER', label: 'Hammer', description: 'Hole-by-hole doubling game' },
  { value: 'SKINS', label: 'Skins', description: 'Win holes outright, split the pot' },
]

function categoryToType(category: BetCategory, scoring: 'gross' | 'net'): SideBetType {
  if (category === 'HAMMER') return 'HAMMER'
  const suffix = scoring === 'net' ? '_NET' : '_GROSS'
  return `${category}${suffix}` as SideBetType
}

function categoryLabel(category: BetCategory) {
  return BET_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

interface Props {
  roundId: string
  round: Round
  members: UserProfile[]
  groupMembers?: UserProfile[]
  groupId?: string
  currentUserId: string
  onClose: () => void
  onCreated: () => void
}

// ─── Player multi-select dropdown ─────────────────────────────────────────────

function PlayerMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: UserProfile[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggle(uid: string) {
    onChange(selected.includes(uid) ? selected.filter((id) => id !== uid) : [...selected, uid])
  }

  const displayText =
    selected.length === 0
      ? 'No players selected'
      : selected.length === 1
        ? options.find((m) => m.uid === selected[0])?.displayName ?? selected[0]
        : `${selected.length} players selected`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-btn-secondary border border-card-border rounded-lg px-3 py-2 text-sm text-muted hover:border-card-border transition-colors"
      >
        <span className="truncate">{displayText}</span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card-bg border border-card-border rounded-xl shadow-xl z-20 overflow-hidden">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No other players in this round.</p>
          ) : (
            options.map((m) => (
              <button
                key={m.uid}
                type="button"
                onClick={() => toggle(m.uid)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  selected.includes(m.uid) ? 'text-blue-400 bg-blue-500/10' : 'text-muted hover:bg-card-bg'
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  selected.includes(m.uid) ? 'bg-blue-600 border-blue-600' : 'border-card-border'
                }`}>
                  {selected.includes(m.uid) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {m.displayName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Radio card ───────────────────────────────────────────────────────────────

function RadioCard({
  selected,
  disabled,
  onClick,
  title,
  description,
}: {
  selected: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  description?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
        disabled
          ? 'border-card-border bg-card-bg opacity-40 cursor-not-allowed'
          : selected
            ? 'border-blue-600 bg-blue-600/10'
            : 'border-card-border bg-card-bg hover:border-blue-600/40'
      }`}
    >
      <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
        selected && !disabled ? 'border-blue-600' : 'border-muted'
      }`}>
        {selected && !disabled && <span className="w-2 h-2 rounded-full bg-blue-600" />}
      </span>
      <div>
        <p className={`text-sm font-semibold ${selected && !disabled ? 'text-blue-600' : 'text-brand'}`}>{title}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
    </button>
  )
}

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-colors ${s <= current ? 'bg-blue-600' : 'bg-card-border'}`}
        />
      ))}
    </div>
  )
}

// ─── Review row ───────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-card-border last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold text-brand">{value}</span>
    </div>
  )
}

// ─── Unified wizard ───────────────────────────────────────────────────────────

export function CreateSideBetModal({ roundId, members, groupMembers, groupId, currentUserId, onClose, onCreated }: Props) {
  const allGroupMembers = groupMembers ?? members
  const canPlay2v2 = allGroupMembers.length >= 4
  const otherMembers = members.filter((m) => m.uid !== currentUserId)
  const otherGroupMembers = allGroupMembers.filter((m) => m.uid !== currentUserId)

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1)

  // Step 1: category
  const [category, setCategory] = useState<BetCategory>('STROKE')

  // Step 2: scoring
  const [scoring, setScoring] = useState<'gross' | 'net'>('gross')

  // Step 3: hammer format (hammer only)
  const [hammerFormat, setHammerFormat] = useState<HammerFormat>('1v1')

  // Step 4: first hammer rule (hammer only)
  const [firstRule, setFirstRule] = useState<HammerFirstRule>('random')

  // Step 5: participants
  const [invitedIds, setInvitedIds] = useState<string[]>([])   // non-hammer
  const [opponent, setOpponent] = useState<string>('')          // hammer 1v1
  const [sideA, setSideA] = useState<string[]>([currentUserId]) // hammer 2v2
  const [sideB, setSideB] = useState<string[]>([])              // hammer 2v2

  // Match Play state
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('1v1')
  const [matchOpponent, setMatchOpponent] = useState<string>('')
  const [matchSideA, setMatchSideA] = useState<string[]>([currentUserId])
  const [matchSideB, setMatchSideB] = useState<string[]>([])

  // Step 6: wager
  const [wager, setWager] = useState('')

  // Submission
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isHammer = category === 'HAMMER'
  const isNassau = category === 'NASSAU'
  const isSkins = category === 'SKINS'
  const isMatch = category === 'MATCH'

  // ── Step count ────────────────────────────────────────────────────────────
  // Hammer: Game Type → Scoring → Format → First Rule → Teams → Wager → Review = 7
  // Match:  Game Type → Scoring → Format → Teams → Wager → Review = 6
  // Others: Game Type → Scoring → Invite → Wager → Review = 5
  const TOTAL_STEPS = isHammer ? 7 : isMatch ? 6 : 5

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getName(uid: string) {
    return allGroupMembers.find((m) => m.uid === uid)?.displayName ??
           members.find((m) => m.uid === uid)?.displayName ?? uid
  }

  function toggleSide(uid: string, side: 'A' | 'B') {
    if (side === 'A') {
      if (sideA.includes(uid)) {
        setSideA(sideA.filter((id) => id !== uid))
      } else if (sideA.length < 2) {
        setSideA([...sideA, uid])
        setSideB(sideB.filter((id) => id !== uid))
      }
    } else {
      if (sideB.includes(uid)) {
        setSideB(sideB.filter((id) => id !== uid))
      } else if (sideB.length < 2) {
        setSideB([...sideB, uid])
        setSideA(sideA.filter((id) => id !== uid))
      }
    }
  }

  function toggleMatchSide(uid: string, side: 'A' | 'B') {
    if (side === 'A') {
      if (matchSideA.includes(uid)) {
        setMatchSideA(matchSideA.filter((id) => id !== uid))
      } else if (matchSideA.length < 2) {
        setMatchSideA([...matchSideA, uid])
        setMatchSideB(matchSideB.filter((id) => id !== uid))
      }
    } else {
      if (matchSideB.includes(uid)) {
        setMatchSideB(matchSideB.filter((id) => id !== uid))
      } else if (matchSideB.length < 2) {
        setMatchSideB([...matchSideB, uid])
        setMatchSideA(matchSideA.filter((id) => id !== uid))
      }
    }
  }

  // ── Step labels (for header) ──────────────────────────────────────────────

  function stepTitle() {
    if (step === 1) return 'Game Type'
    if (step === 2) return 'Scoring'
    if (isHammer) {
      if (step === 3) return 'Game Format'
      if (step === 4) return 'First Hammer Rule'
      if (step === 5) return hammerFormat === '1v1' ? 'Choose Opponent' : 'Assign Teams'
      if (step === 6) return 'Base Stake'
      if (step === 7) return 'Review'
    } else if (isMatch) {
      if (step === 3) return 'Game Format'
      if (step === 4) return matchFormat === '1v1' ? 'Choose Opponent' : 'Assign Teams'
      if (step === 5) return 'Wager'
      if (step === 6) return 'Review'
    } else {
      if (step === 3) return 'Invite Opponents'
      if (step === 4) return 'Wager'
      if (step === 5) return 'Review'
    }
    return 'New Side Bet'
  }

  // ── Advance guard ─────────────────────────────────────────────────────────

  function canAdvance() {
    if (step === 1) return true
    if (step === 2) return true
    if (isHammer) {
      if (step === 3) return true
      if (step === 4) return true
      if (step === 5) {
        if (hammerFormat === '1v1') return !!opponent
        return sideA.length === 2 && sideB.length === 2
      }
      if (step === 6) {
        const n = parseFloat(wager)
        return !isNaN(n) && n > 0
      }
      if (step === 7) return true
    } else if (isMatch) {
      if (step === 3) return true
      if (step === 4) {
        if (matchFormat === '1v1') return !!matchOpponent
        return matchSideA.length === 2 && matchSideB.length === 2
      }
      if (step === 5) {
        const n = parseFloat(wager)
        return !isNaN(n) && n > 0
      }
      if (step === 6) return true
    } else {
      if (step === 3) return true
      if (step === 4) {
        const n = parseFloat(wager)
        return !isNaN(n) && n > 0
      }
      if (step === 5) return true
    }
    return false
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleBack() {
    setError('')
    setStep(step - 1)
  }

  async function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1)
      return
    }
    // Final step → create
    setError('')
    setSaving(true)
    try {
      if (isHammer) {
        const finalSideA = hammerFormat === '1v1' ? [currentUserId] : sideA
        const finalSideB = hammerFormat === '1v1' ? [opponent] : sideB
        await sideBetService.createHammerBet(roundId, {
          createdBy: currentUserId,
          groupId: groupId ?? '',
          format: hammerFormat,
          firstRule,
          sideA: finalSideA,
          sideB: finalSideB,
          baseStake: parseFloat(wager),
          scoring,
        })
      } else if (isMatch) {
        const finalSideA = matchFormat === '1v1' ? [currentUserId] : matchSideA
        const finalSideB = matchFormat === '1v1' ? [matchOpponent] : matchSideB
        await sideBetService.createMatchBet(roundId, {
          createdBy: currentUserId,
          format: matchFormat,
          sideA: finalSideA,
          sideB: finalSideB,
          wager: parseFloat(wager),
          scoring,
        })
      } else {
        await sideBetService.createSideBet(roundId, {
          type: categoryToType(category, scoring),
          wagerPerPerson: parseFloat(wager),
          createdBy: currentUserId,
          invitedIds,
        })
      }
      onCreated()
      onClose()
    } catch {
      setError('Failed to create bet. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCategorySelect(c: BetCategory) {
    if (c !== category) {
      setCategory(c)
      setScoring('gross')
      setHammerFormat('1v1')
      setFirstRule('random')
      setInvitedIds([])
      setOpponent('')
      setSideA([currentUserId])
      setSideB([])
      setMatchFormat('1v1')
      setMatchOpponent('')
      setMatchSideA([currentUserId])
      setMatchSideB([])
      setWager('')
      setError('')
    }
  }

  // ── Wager label ───────────────────────────────────────────────────────────

  function wagerLabel() {
    if (isHammer) return 'Base Stake per Hole ($)'
    if (isNassau) return 'Wager per Segment ($)'
    if (isSkins) return 'Entry Wager per Person ($)'
    return 'Wager per Person ($)'
  }

  function wagerHelper() {
    const amt = wager || 'X'
    if (isHammer) return `Each hole starts at $${amt}. The stake doubles each time the hammer is thrown and accepted.`
    if (isNassau) return `$${amt} per segment (Front 9, Back 9, Total). Max exposure: $${wager ? (parseFloat(wager) * 3).toFixed(2) : '3X'} per person.`
    if (isSkins) {
      const count = invitedIds.length + 1
      const pot = wager ? (parseFloat(wager) * count).toFixed(2) : `${count}X`
      return `Total pot: $${pot} (${count} players × $${amt}). Split equally among all holes with an outright winner.`
    }
    if (isMatch) return `Each loser pays each winner $${amt}. Flat wager for the full match.`
    return `Each loser pays each winner $${amt}.`
  }

  // ── Review summary ────────────────────────────────────────────────────────

  function reviewRows() {
    const rows: { label: string; value: string }[] = [
      { label: 'Game Type', value: categoryLabel(category) },
      { label: 'Scoring', value: scoring === 'gross' ? 'Gross' : 'Net' },
    ]
    if (isHammer) {
      rows.push({ label: 'Format', value: hammerFormat === '1v1' ? 'Head-to-Head (1v1)' : 'Teams (2v2)' })
      rows.push({ label: 'First Hammer', value: firstRule === 'random' ? 'Random' : 'Open' })
      if (hammerFormat === '1v1') {
        rows.push({ label: 'You', value: getName(currentUserId) })
        rows.push({ label: 'Opponent', value: getName(opponent) })
      } else {
        rows.push({ label: 'Side A', value: sideA.map(getName).join(', ') })
        rows.push({ label: 'Side B', value: sideB.map(getName).join(', ') })
      }
      rows.push({ label: 'Base Stake / Hole', value: `$${parseFloat(wager).toFixed(2)}` })
    } else if (isMatch) {
      rows.push({ label: 'Format', value: matchFormat === '1v1' ? 'Head-to-Head (1v1)' : 'Teams (2v2)' })
      if (matchFormat === '1v1') {
        rows.push({ label: 'You', value: getName(currentUserId) })
        rows.push({ label: 'Opponent', value: getName(matchOpponent) })
      } else {
        rows.push({ label: 'Side A', value: matchSideA.map(getName).join(', ') })
        rows.push({ label: 'Side B', value: matchSideB.map(getName).join(', ') })
      }
      rows.push({ label: 'Wager / Person', value: `$${parseFloat(wager).toFixed(2)}` })
    } else {
      const invited = invitedIds.map(getName)
      rows.push({ label: 'Invited', value: invited.length > 0 ? invited.join(', ') : 'None (open)' })
      const wagerRowLabel = isNassau ? 'Wager / Segment' : isSkins ? 'Entry / Person' : 'Wager / Person'
      rows.push({ label: wagerRowLabel, value: `$${parseFloat(wager).toFixed(2)}` })
    }
    return rows
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-card-bg rounded-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <div>
            <h2 className="text-base font-semibold text-brand">New Side Bet</h2>
            <p className="text-xs text-muted">{stepTitle()}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-brand text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-4 flex flex-col gap-5">

          {/* Progress */}
          <StepBar current={step} total={TOTAL_STEPS} />

          {/* ── Step 1: Game Type ── */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-2">
              {BET_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleCategorySelect(c.value)}
                  className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                    category === c.value ? 'border-blue-600 bg-blue-600/10' : 'border-card-border bg-card-bg hover:border-blue-600/40'
                  }`}
                >
                  <span className={`text-sm font-semibold ${category === c.value ? 'text-blue-600' : 'text-brand'}`}>{c.label}</span>
                  <span className="text-xs text-muted">{c.description}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2: Scoring ── */}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <RadioCard
                selected={scoring === 'gross'}
                onClick={() => setScoring('gross')}
                title="Gross"
                description="Raw stroke count — no handicap applied"
              />
              <RadioCard
                selected={scoring === 'net'}
                onClick={() => setScoring('net')}
                title="Net"
                description="Strokes applied based on handicap"
              />
            </div>
          )}

          {/* ── Step 3 (Hammer): Format ── */}
          {isHammer && step === 3 && (
            <div className="flex flex-col gap-3">
              {(['1v1', '2v2'] as HammerFormat[]).map((f) => {
                const disabled = f === '2v2' && !canPlay2v2
                return (
                  <RadioCard
                    key={f}
                    selected={hammerFormat === f}
                    disabled={disabled}
                    onClick={() => !disabled && setHammerFormat(f)}
                    title={f === '1v1' ? 'Head-to-Head (1v1)' : 'Teams (2v2)'}
                    description={f === '1v1' ? 'You vs one opponent' : disabled ? 'Requires 4 players in the group' : 'Two 2-person teams'}
                  />
                )
              })}
            </div>
          )}

          {/* ── Step 4 (Hammer): First Hammer Rule ── */}
          {isHammer && step === 4 && (
            <div className="flex flex-col gap-3">
              {(['random', 'open'] as HammerFirstRule[]).map((r) => (
                <RadioCard
                  key={r}
                  selected={firstRule === r}
                  onClick={() => setFirstRule(r)}
                  title={r === 'random' ? 'Random' : 'Open'}
                  description={
                    r === 'random'
                      ? 'System randomly assigns which side may throw first'
                      : 'Either side may throw the first hammer at any time'
                  }
                />
              ))}
            </div>
          )}

          {/* ── Step 5 (Hammer): Participants ── */}
          {isHammer && step === 5 && hammerFormat === '1v1' && (
            <div className="flex flex-col gap-3">
              {otherGroupMembers.length === 0 && (
                <p className="text-sm text-muted">No other players in this group.</p>
              )}
              {otherGroupMembers.map((m) => (
                <RadioCard
                  key={m.uid}
                  selected={opponent === m.uid}
                  onClick={() => setOpponent(m.uid)}
                  title={m.displayName}
                />
              ))}
            </div>
          )}

          {isHammer && step === 5 && hammerFormat === '2v2' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted">Tap A or B to assign each player to a side (2 per team).</p>
              <div className="flex flex-col gap-2">
                {allGroupMembers.map((m) => {
                  const onA = sideA.includes(m.uid)
                  const onB = sideB.includes(m.uid)
                  return (
                    <div key={m.uid} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card-bg border border-card-border">
                      <span className="flex-1 text-sm font-semibold text-brand">{m.displayName}</span>
                      <button
                        type="button"
                        onClick={() => toggleSide(m.uid, 'A')}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          onA ? 'bg-blue-600 text-white' : 'bg-card-border text-muted hover:bg-blue-600/20'
                        }`}
                      >A</button>
                      <button
                        type="button"
                        onClick={() => toggleSide(m.uid, 'B')}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          onB ? 'bg-brand text-white' : 'bg-card-border text-muted hover:bg-brand/20'
                        }`}
                      >B</button>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 text-xs text-muted px-1">
                <span className="text-blue-600 font-semibold">Side A:</span>
                <span>{sideA.map(getName).join(', ') || '—'}</span>
                <span className="text-brand font-semibold ml-2">Side B:</span>
                <span>{sideB.map(getName).join(', ') || '—'}</span>
              </div>
            </div>
          )}

          {/* ── Step 3 (Match): Format ── */}
          {isMatch && step === 3 && (
            <div className="flex flex-col gap-3">
              {(['1v1', '2v2'] as MatchFormat[]).map((f) => {
                const disabled = f === '2v2' && !canPlay2v2
                return (
                  <RadioCard
                    key={f}
                    selected={matchFormat === f}
                    disabled={disabled}
                    onClick={() => !disabled && setMatchFormat(f)}
                    title={f === '1v1' ? 'Head-to-Head (1v1)' : 'Teams (2v2)'}
                    description={f === '1v1' ? 'You vs one opponent' : disabled ? 'Requires 4 players in the group' : 'Two 2-person teams'}
                  />
                )
              })}
            </div>
          )}

          {/* ── Step 4 (Match 1v1): Choose Opponent ── */}
          {isMatch && step === 4 && matchFormat === '1v1' && (
            <div className="flex flex-col gap-3">
              {otherGroupMembers.length === 0 && (
                <p className="text-sm text-muted">No other players in this group.</p>
              )}
              {otherGroupMembers.map((m) => (
                <RadioCard
                  key={m.uid}
                  selected={matchOpponent === m.uid}
                  onClick={() => setMatchOpponent(m.uid)}
                  title={m.displayName}
                />
              ))}
            </div>
          )}

          {/* ── Step 4 (Match 2v2): Assign Teams ── */}
          {isMatch && step === 4 && matchFormat === '2v2' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted">Tap A or B to assign each player to a side (2 per team).</p>
              <div className="flex flex-col gap-2">
                {allGroupMembers.map((m) => {
                  const onA = matchSideA.includes(m.uid)
                  const onB = matchSideB.includes(m.uid)
                  return (
                    <div key={m.uid} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card-bg border border-card-border">
                      <span className="flex-1 text-sm font-semibold text-brand">{m.displayName}</span>
                      <button
                        type="button"
                        onClick={() => toggleMatchSide(m.uid, 'A')}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          onA ? 'bg-blue-600 text-white' : 'bg-card-border text-muted hover:bg-blue-600/20'
                        }`}
                      >A</button>
                      <button
                        type="button"
                        onClick={() => toggleMatchSide(m.uid, 'B')}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          onB ? 'bg-brand text-white' : 'bg-card-border text-muted hover:bg-brand/20'
                        }`}
                      >B</button>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 text-xs text-muted px-1">
                <span className="text-blue-600 font-semibold">Side A:</span>
                <span>{matchSideA.map(getName).join(', ') || '—'}</span>
                <span className="text-brand font-semibold ml-2">Side B:</span>
                <span>{matchSideB.map(getName).join(', ') || '—'}</span>
              </div>
            </div>
          )}

          {/* ── Step 3 (non-Hammer/non-Match): Invite ── */}
          {!isHammer && !isMatch && step === 3 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted px-1">All round members can see and request to join. Inviting sends them a direct notification.</p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <span className="text-sm text-blue-300 flex-1">
                  {members.find((m) => m.uid === currentUserId)?.displayName ?? 'You'}
                </span>
                <span className="text-xs text-blue-500">You (in)</span>
              </div>
              {isSkins && otherMembers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setInvitedIds(otherMembers.map((m) => m.uid))}
                  className="h-8 px-3 rounded-lg border border-blue-600 text-blue-600 text-xs font-semibold hover:bg-blue-600/10 transition-colors"
                >
                  Invite All
                </button>
              )}
              <PlayerMultiSelect
                options={otherMembers}
                selected={invitedIds}
                onChange={setInvitedIds}
              />
            </div>
          )}

          {/* ── Step 4 (non-Hammer/non-Match) or Step 5 (Match) or Step 6 (Hammer): Wager ── */}
          {((!isHammer && !isMatch && step === 4) || (isMatch && step === 5) || (isHammer && step === 6)) && (
            <div className="flex flex-col gap-2">
              <Input
                label={wagerLabel()}
                type="number"
                min="0.50"
                step="0.50"
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                placeholder="1.00"
              />
              <p className="text-xs text-muted px-1">{wagerHelper()}</p>
            </div>
          )}

          {/* ── Step 5 (non-Hammer/non-Match) or Step 6 (Match) or Step 7 (Hammer): Review ── */}
          {((!isHammer && !isMatch && step === 5) || (isMatch && step === 6) || (isHammer && step === 7)) && (
            <div className="flex flex-col gap-1 rounded-xl border border-card-border px-4 py-2 bg-card-bg">
              {reviewRows().map((row) => (
                <ReviewRow key={row.label} label={row.label} value={row.value} />
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Navigation */}
          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 h-10 rounded-xl border border-card-border text-brand text-sm font-semibold hover:bg-card-border/20 transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance() || saving}
              className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {step < TOTAL_STEPS
                ? 'Next'
                : saving
                  ? 'Creating...'
                  : 'Create Bet'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
