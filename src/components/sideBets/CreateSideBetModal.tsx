import { useState, useEffect, useRef } from 'react'
import { sideBetService } from '@/services/sideBetService'
import { Input, SelectField } from '@/components/ui'
import type { Round, UserProfile, SideBetType } from '@/types'

const BET_TYPES: { value: SideBetType; label: string; stub?: boolean }[] = [
  { value: 'CHALLENGE_GROSS', label: 'Challenge Golfers (Gross)' },
  { value: 'CHALLENGE_NET', label: 'Challenge Golfers (Net)' },
  { value: 'CHALLENGE_TEAM_GROSS', label: 'Challenge Teams (Gross)' },
  { value: 'CHALLENGE_TEAM_NET', label: 'Challenge Teams (Net)' },
  { value: 'NASSAU_GROSS', label: 'Nassau - Front/Back/Total (Gross)', stub: true },
  { value: 'NASSAU_NET', label: 'Nassau - Front/Back/Total (Net)', stub: true },
  { value: 'SKINS', label: 'Skins', stub: true },
]

interface Props {
  roundId: string
  round: Round
  members: UserProfile[]
  currentUserId: string
  onClose: () => void
  onCreated: () => void
}

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

export function CreateSideBetModal({ roundId, members, currentUserId, onClose, onCreated }: Props) {
  const [betType, setBetType] = useState<SideBetType>('CHALLENGE_GROSS')
  const [isPublic, setIsPublic] = useState(false)
  const [invitedIds, setInvitedIds] = useState<string[]>([])
  const [wager, setWager] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedType = BET_TYPES.find((t) => t.value === betType)!
  const isStub = selectedType.stub === true
  const otherMembers = members.filter((m) => m.uid !== currentUserId)

  async function handleCreate() {
    setError('')
    const wagerNum = parseFloat(wager)
    if (isNaN(wagerNum) || wagerNum <= 0) {
      setError('Enter a valid wager amount.')
      return
    }
    if (!isPublic && invitedIds.length === 0) {
      setError('Invite at least one player, or make the bet public.')
      return
    }
    setSaving(true)
    try {
      await sideBetService.createSideBet(roundId, {
        type: betType,
        wagerPerPerson: wagerNum,
        createdBy: currentUserId,
        isPublic,
        invitedIds,
      })
      onCreated()
      onClose()
    } catch {
      setError('Failed to create bet.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-card-bg rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <h2 className="text-base font-semibold text-brand">New Side Bet</h2>
          <button onClick={onClose} className="text-muted hover:text-brand text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-4 flex flex-col gap-5">
          {/* Bet type */}
          <SelectField
            label="Bet Type"
            options={BET_TYPES.map((t) => ({
              value: t.value,
              label: t.stub ? `${t.label} (Coming soon)` : t.label,
              disabled: t.stub,
            }))}
            value={betType}
            onChange={(val) => setBetType(val as SideBetType)}
            colorScheme="blue"
          />

          {isStub && (
            <p className="text-sm text-muted text-center py-2">This bet type is coming soon.</p>
          )}

          {!isStub && (
            <>
              {/* Visibility toggle */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">Visibility</span>
                <div className="flex rounded-lg overflow-hidden border border-card-border">
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      !isPublic
                        ? 'bg-blue-600 text-white'
                        : 'bg-btn-secondary text-muted hover:text-brand'
                    }`}
                  >
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      isPublic
                        ? 'bg-blue-600 text-white'
                        : 'bg-btn-secondary text-muted hover:text-brand'
                    }`}
                  >
                    Public
                  </button>
                </div>
                <p className="text-xs text-muted px-1">
                  {isPublic
                    ? 'Anyone in the round can join this bet.'
                    : 'Only people you invite can join this bet.'}
                </p>
              </div>

              {/* Invite players */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">
                  {isPublic ? 'Pre-invite Players (optional)' : 'Invite Players'}
                </span>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <span className="text-sm text-blue-300 flex-1">
                    {members.find((m) => m.uid === currentUserId)?.displayName ?? 'You'}
                  </span>
                  <span className="text-xs text-blue-500">You (in)</span>
                </div>
                <PlayerMultiSelect
                  options={otherMembers}
                  selected={invitedIds}
                  onChange={setInvitedIds}
                />
              </div>

              {/* Wager */}
              <div className="flex flex-col gap-1">
                <Input
                  label="Wager per person ($)"
                  type="number"
                  min="0"
                  step="0.50"
                  value={wager}
                  onChange={(e) => setWager(e.target.value)}
                  placeholder="e.g. 5"
                />
                <p className="text-xs text-muted px-1">
                  Each loser pays each winner ${wager || 'X'}. Winners collect from every other participant.
                </p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-colors"
              >
                {saving ? 'Creating...' : 'Create Bet'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
