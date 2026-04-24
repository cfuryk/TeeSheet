import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { sideBetService } from '@/services/sideBetService'
import { roundService } from '@/services/roundService'
import { userService } from '@/services/userService'
import { Spinner, Card, Button, Badge } from '@/components/ui'
import { roundTypeLabel } from '@/lib/formatters'
import type { SideBet, SideBetStatus, SideBetType, Round, RoundStatus } from '@/types'

// ─── Unified bet item ──────────────────────────────────────────────────────────

type BetKind = 'side_bet' | 'round_wager'

interface UnifiedBet {
  id: string
  kind: BetKind
  // shared display fields
  typeLabel: string
  roundName: string
  roundId: string
  status: SideBetStatus | RoundStatus
  wager: number
  participantCount: number
  participantNames: string[]
  winnersNames: string[]
  isTie: boolean
  // for navigation
  sideBetId?: string
  // raw createdAt for sorting
  createdAt: { seconds: number } | null
}

const BET_TYPE_LABELS: Record<SideBetType, string> = {
  STROKE_GROSS: 'Stroke (Gross)',
  STROKE_NET: 'Stroke (Net)',
  NASSAU_GROSS: 'Nassau (Gross)',
  NASSAU_NET: 'Nassau (Net)',
  MATCH_GROSS: 'Match (Gross)',
  MATCH_NET: 'Match (Net)',
}

const SIDE_BET_STATUS_VARIANT: Record<SideBetStatus, 'gray' | 'blue' | 'green' | 'yellow'> = {
  pending: 'yellow',
  active: 'blue',
  settled: 'green',
  cancelled: 'gray',
}

const ROUND_STATUS_VARIANT: Record<RoundStatus, 'gray' | 'blue' | 'green' | 'yellow'> = {
  pending: 'yellow',
  active: 'blue',
  completed: 'green',
}

const KIND_OPTIONS: BetKind[] = ['side_bet', 'round_wager']
const KIND_LABELS: Record<BetKind, string> = { side_bet: 'Side Bet', round_wager: 'Round Wager' }

const SIDE_BET_STATUSES: SideBetStatus[] = ['pending', 'active', 'settled', 'cancelled']
const ROUND_STATUSES: RoundStatus[] = ['pending', 'active', 'completed']
const ALL_STATUSES = [...new Set([...SIDE_BET_STATUSES, ...ROUND_STATUSES])]

// ─── MultiSelect component ────────────────────────────────────────────────────

function MultiSelect<T extends string>({
  label,
  options,
  selected,
  onChange,
  renderLabel,
}: {
  label: string
  options: T[]
  selected: T[]
  onChange: (next: T[]) => void
  renderLabel: (v: T) => string
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

  function toggle(v: T) {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])
  }

  const displayText = selected.length === 0
    ? `All ${label}`
    : selected.length === 1
      ? renderLabel(selected[0])
      : `${selected.length} selected`

  return (
    <div className="relative flex-1 min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-brand hover:border-card-border transition-colors"
      >
        <span className="truncate">{displayText}</span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-card-border rounded-xl shadow-xl z-20 overflow-hidden">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              selected.length === 0 ? 'text-blue-400 bg-blue-500/10' : 'text-muted hover:bg-card-bg'
            }`}
          >
            All {label}
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                selected.includes(opt) ? 'text-blue-400 bg-blue-500/10' : 'text-brand hover:bg-card-bg'
              }`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-gray-500'
              }`}>
                {selected.includes(opt) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {renderLabel(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminBetsPage() {
  const navigate = useNavigate()
  const [sideBets, setSideBets] = useState<SideBet[]>([])
  const [wagerRounds, setWagerRounds] = useState<Round[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [roundNames, setRoundNames] = useState<Record<string, string>>({})
  const [sideBetsLoading, setSideBetsLoading] = useState(true)
  const [roundsLoading, setRoundsLoading] = useState(true)

  const [kindFilter, setKindFilter] = useState<BetKind[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])

  useEffect(() => {
    roundService.getAllRoundNames().then(setRoundNames)
    const unsubBets = sideBetService.onAllSideBetsSnapshot((all) => {
      setSideBets(all)
      setSideBetsLoading(false)
    })
    const unsubRounds = roundService.onWagerRoundsSnapshot((rounds) => {
      setWagerRounds(rounds)
      setRoundsLoading(false)
    })
    return () => { unsubBets(); unsubRounds() }
  }, [])

  // Collect all uids needing display names
  useEffect(() => {
    const allUids = [
      ...new Set([
        ...sideBets.flatMap((b) => [...b.participantIds, ...b.invitedIds]),
        ...wagerRounds.flatMap((r) => r.memberIds ?? []),
      ])
    ]
    const missing = allUids.filter((uid) => !names[uid])
    if (missing.length === 0) return
    Promise.all(missing.map((uid) => userService.getProfile(uid).then((p) => ({ uid, name: p?.displayName ?? uid }))))
      .then((results) => {
        setNames((prev) => {
          const next = { ...prev }
          for (const { uid, name } of results) next[uid] = name
          return next
        })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideBets, wagerRounds])

  // Build unified list
  const allBets = useMemo<UnifiedBet[]>(() => {
    const items: UnifiedBet[] = []

    for (const b of sideBets) {
      const winners = b.winnersIds ?? []
      items.push({
        id: b.sideBetId,
        kind: 'side_bet',
        typeLabel: BET_TYPE_LABELS[b.type] ?? b.type,
        roundName: roundNames[b.roundId] ?? b.roundId,
        roundId: b.roundId,
        status: b.status,
        wager: b.wagerPerPerson,
        participantCount: b.participantIds.length,
        participantNames: [...b.participantIds.map((u) => names[u] ?? u), ...b.invitedIds.map((u) => `${names[u] ?? u}?`)],
        winnersNames: winners.map((u) => names[u] ?? u),
        isTie: b.status === 'settled' && winners.length === 0,
        sideBetId: b.sideBetId,
        createdAt: b.createdAt as { seconds: number } | null,
      })
    }

    for (const r of wagerRounds) {
      items.push({
        id: r.roundId,
        kind: 'round_wager',
        typeLabel: roundTypeLabel(r.roundType),
        roundName: r.name,
        roundId: r.roundId,
        status: r.status,
        wager: r.wager!,
        participantCount: r.memberIds?.length ?? 0,
        participantNames: (r.memberIds ?? []).map((u) => names[u] ?? u),
        winnersNames: [],
        isTie: false,
        createdAt: r.createdAt as { seconds: number } | null,
      })
    }

    // Sort newest first
    items.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
    return items
  }, [sideBets, wagerRounds, names, roundNames])

  const filtered = useMemo(() => {
    return allBets.filter((b) => {
      if (kindFilter.length > 0 && !kindFilter.includes(b.kind)) return false
      if (statusFilter.length > 0 && !statusFilter.includes(b.status)) return false
      return true
    })
  }, [allBets, kindFilter, statusFilter])

  const loading = sideBetsLoading || roundsLoading

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brand">Admin Bets</h2>
        <Button variant="primary" size="sm" onClick={() => navigate('/admin')}>Back</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <MultiSelect
          label="Types"
          options={KIND_OPTIONS}
          selected={kindFilter}
          onChange={setKindFilter}
          renderLabel={(v) => KIND_LABELS[v]}
        />
        <MultiSelect
          label="Statuses"
          options={ALL_STATUSES}
          selected={statusFilter}
          onChange={setStatusFilter}
          renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted">No bets match the current filters.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((bet) => {
            const statusVariant = bet.kind === 'side_bet'
              ? SIDE_BET_STATUS_VARIANT[bet.status as SideBetStatus] ?? 'gray'
              : ROUND_STATUS_VARIANT[bet.status as RoundStatus] ?? 'gray'

            return (
              <button
                key={bet.id}
                type="button"
                onClick={() =>
                  bet.kind === 'side_bet'
                    ? navigate(`/rounds/${bet.roundId}/side-bets/${bet.sideBetId}?from=admin`)
                    : navigate(`/rounds/${bet.roundId}`)
                }
                className="w-full text-left"
              >
                <Card className="p-4 hover:border-card-border transition-colors flex flex-col gap-2.5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand">{bet.typeLabel}</p>
                      <p className="text-xs text-muted truncate mt-0.5">{bet.roundName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        bet.kind === 'round_wager'
                          ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
                          : 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                      }`}>
                        {KIND_LABELS[bet.kind]}
                      </span>
                      <Badge label={bet.status.charAt(0).toUpperCase() + bet.status.slice(1)} variant={statusVariant as 'gray' | 'blue' | 'green' | 'yellow'} />
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="flex flex-wrap gap-1">
                    {bet.participantNames.map((name, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          bet.winnersNames.includes(name)
                            ? 'bg-brand/10 text-brand ring-1 ring-brand/50'
                            : 'bg-card-bg text-brand'
                        }`}
                      >
                        {name}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">
                      ${bet.wager.toFixed(2)} {bet.kind === 'round_wager' ? 'per player' : '/ person'}
                      {' · '}{bet.participantCount} participant{bet.participantCount !== 1 ? 's' : ''}
                    </p>
                    {bet.winnersNames.length > 0 && (
                      <p className="text-xs text-brand font-medium">
                        🏆 {bet.winnersNames.join(', ')}
                      </p>
                    )}
                    {bet.isTie && (
                      <p className="text-xs text-muted font-medium">🤝 Tie</p>
                    )}
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
