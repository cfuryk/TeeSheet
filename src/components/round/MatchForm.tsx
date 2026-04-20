import { useState } from 'react'
import { MatchFormValues } from '@/schemas/roundSchemas'
import { TeamFormat } from '@/types/round'
import { Button, Card } from '@/components/ui'

interface RoundMember {
  uid: string
  displayName: string
  handicap: number | null
}

// A slot in a foursome belongs to either team A or team B
interface SlotRef {
  foursomeIndex: number
  team: 'A' | 'B'
  slotIndex: number   // index within that team's array
}

interface Props {
  value: MatchFormValues | null
  onChange: (v: MatchFormValues | null) => void
  roundMembers?: RoundMember[]
}

// ---------------------------------------------------------------------------
// Team fairness helpers
// ---------------------------------------------------------------------------

type FairnessRating = 'Great' | 'Good' | 'Fair' | 'Poor'
const RATING_ORDER: FairnessRating[] = ['Great', 'Good', 'Fair', 'Poor']

function downgrade(rating: FairnessRating, steps: number): FairnessRating {
  const idx = Math.min(RATING_ORDER.indexOf(rating) + steps, RATING_ORDER.length - 1)
  return RATING_ORDER[idx]
}

export function evaluateTeamFairness(
  teamA: RoundMember[],
  teamB: RoundMember[],
): FairnessRating | null {
  const withHcp = [...teamA, ...teamB].filter((m) => m.handicap != null)
  if (withHcp.length < 2 || teamA.length === 0 || teamB.length === 0) return null

  const hcpA = teamA.map((m) => m.handicap ?? 0)
  const hcpB = teamB.map((m) => m.handicap ?? 0)
  const T1 = hcpA.reduce((s, h) => s + h, 0)
  const T2 = hcpB.reduce((s, h) => s + h, 0)
  const F = T1 + T2
  if (F === 0) return 'Great'

  const HIR = Math.abs(T1 - T2) / F
  let rating: FairnessRating =
    HIR <= 0.025 ? 'Great' :
    HIR <= 0.050 ? 'Good' :
    HIR <= 0.075 ? 'Fair' : 'Poor'

  const N = Math.min(teamA.length, teamB.length)
  const K = Math.max(1, Math.round(N * 0.33))
  const sortedA = [...hcpA].sort((a, b) => a - b)
  const sortedB = [...hcpB].sort((a, b) => a - b)
  const sumK = (arr: number[], fromEnd = false) =>
    (fromEnd ? arr.slice(-K) : arr.slice(0, K)).reduce((s, v) => s + v, 0)

  const topImbalance = Math.abs(sumK(sortedA) - sumK(sortedB))
  const bottomImbalance = Math.abs(sumK(sortedA, true) - sumK(sortedB, true))

  let penaltySteps = 0
  if (topImbalance > 2.5 * K) penaltySteps += 2
  else if (topImbalance > 1.5 * K) penaltySteps += 1
  if (bottomImbalance > 3.0 * K) penaltySteps += 1
  if (penaltySteps > 0) rating = downgrade(rating, penaltySteps)

  return rating
}

/**
 * Auto-builds the fairest two teams using snake-draft + swap-optimize,
 * then distributes them into foursomes of up to 4 (2A + 2B).
 */
export function buildFairTeams(
  members: RoundMember[],
): { teamA: string[]; teamB: string[]; foursomes: { teamA: string[]; teamB: string[] }[] } {
  const sorted = [...members].sort((a, b) => (a.handicap ?? 0) - (b.handicap ?? 0))
  const teamA: RoundMember[] = []
  const teamB: RoundMember[] = []

  sorted.forEach((p, i) => {
    const cycle = i % 4
    if (cycle === 0 || cycle === 3) teamA.push(p)
    else teamB.push(p)
  })

  let sumA = teamA.reduce((s, m) => s + (m.handicap ?? 0), 0)
  let sumB = teamB.reduce((s, m) => s + (m.handicap ?? 0), 0)
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < teamA.length; i++) {
      for (let j = 0; j < teamB.length; j++) {
        const hA = teamA[i].handicap ?? 0
        const hB = teamB[j].handicap ?? 0
        const newSumA = sumA - hA + hB
        const newSumB = sumB - hB + hA
        if (Math.abs(newSumA - newSumB) < Math.abs(sumA - sumB)) {
          const tmp = teamA[i]; teamA[i] = teamB[j]; teamB[j] = tmp
          sumA = newSumA; sumB = newSumB; improved = true
        }
      }
    }
  }

  // Distribute into foursomes of 2A + 2B, last group can be partial
  const foursomes: { teamA: string[]; teamB: string[] }[] = []
  const maxLen = Math.max(teamA.length, teamB.length)
  for (let i = 0; i < maxLen; i += 2) {
    foursomes.push({
      teamA: teamA.slice(i, i + 2).map((m) => m.uid),
      teamB: teamB.slice(i, i + 2).map((m) => m.uid),
    })
  }

  return {
    teamA: teamA.map((m) => m.uid),
    teamB: teamB.map((m) => m.uid),
    foursomes,
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

const FAIRNESS_STYLES: Record<FairnessRating, string> = {
  Great: 'bg-green-500 text-white',
  Good:  'bg-blue-400 text-white',
  Fair:  'bg-yellow-400 text-black',
  Poor:  'bg-danger text-white',
}

const MATCH_TYPES_BY_FORMAT: Record<TeamFormat, { value: string; label: string }[]> = {
  INDIVIDUAL: [
    { value: 'STROKE', label: 'Stroke' },
    { value: 'NASSAU', label: 'Nassau' },
    { value: 'MATCH_PLAY', label: 'Match Play' },
    { value: 'HAMMER', label: 'Hammer' },
    { value: 'SKINS', label: 'Skins' },
  ],
  AGGREGATE: [
    { value: 'STROKE', label: 'Stroke' },
    { value: 'BEST_BALL', label: 'Best Ball' },
  ],
  H2H_1V1: [
    { value: 'STROKE', label: 'Stroke' },
    { value: 'NASSAU', label: 'Nassau' },
    { value: 'MATCH_PLAY', label: 'Match Play' },
    { value: 'HAMMER', label: 'Hammer' },
    { value: 'SKINS', label: 'Skins' },
  ],
  H2H_2V2: [
    { value: 'STROKE', label: 'Stroke' },
    { value: 'NASSAU', label: 'Nassau' },
    { value: 'BEST_BALL', label: 'Best Ball' },
    { value: 'HAMMER', label: 'Hammer' },
    { value: 'HIGH_LOW', label: 'High Low' },
    { value: 'SKINS', label: 'Skins' },
  ],
}

const TEAM_FORMAT_OPTIONS: { value: TeamFormat; label: string; description: string }[] = [
  { value: 'AGGREGATE', label: 'Aggregate Team', description: 'Combined team score counts' },
  { value: 'H2H_1V1', label: 'Head to Head (1 vs 1)', description: 'One player vs one player' },
  { value: 'H2H_2V2', label: 'Head to Head (2 vs 2)', description: 'Two players vs two players' },
]

function defaultMatch(): MatchFormValues {
  return { teamFormat: 'INDIVIDUAL', scoring: 'GROSS', matchType: 'STROKE', teamA: [], teamB: [], foursomes: [] }
}

function toggleClass(active: boolean) {
  return active
    ? 'bg-brand text-white border-brand'
    : 'text-brand border-card-border hover:bg-btn-secondary'
}

const inactiveStyle = { backgroundColor: '#D7DCE0' }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchForm({ value, onChange, roundMembers = [] }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<SlotRef | null>(null)
  const [selectedUnassignedUid, setSelectedUnassignedUid] = useState<string | null>(null)

  if (value === null) {
    return (
      <Button type="button" variant="secondary" size="sm" className="w-full"
        onClick={() => onChange(defaultMatch())}>
        + Add Match to Round
      </Button>
    )
  }

  function set<K extends keyof MatchFormValues>(key: K, val: MatchFormValues[K]) {
    onChange({ ...value!, [key]: val })
  }

  function handleTeamFormatChange(teamFormat: TeamFormat) {
    const firstType = MATCH_TYPES_BY_FORMAT[teamFormat][0].value as MatchFormValues['matchType']
    onChange({ ...value!, teamFormat, matchType: firstType, teamA: [], teamB: [], foursomes: [] })
    setSelectedSlot(null); setSelectedUnassignedUid(null)
  }

  function handleScoringChange(scoring: 'GROSS' | 'NET') {
    onChange({ ...value!, scoring, handicapPercent: scoring === 'NET' ? (value!.handicapPercent ?? 80) : undefined })
  }

  function handleAutoBuild() {
    const result = buildFairTeams(roundMembers)
    onChange({ ...value!, teamA: result.teamA, teamB: result.teamB, foursomes: result.foursomes })
    setSelectedSlot(null); setSelectedUnassignedUid(null)
  }

  // ---------------------------------------------------------------------------
  // Click-swap interaction
  // A click on an unassigned player or a filled slot selects it.
  // A second click on a different target performs the swap.
  // ---------------------------------------------------------------------------

  const foursomes = value.foursomes ?? []

  function getUidAtSlot(slot: SlotRef): string | null {
    const fs = foursomes[slot.foursomeIndex]
    if (!fs) return null
    const arr = slot.team === 'A' ? fs.teamA : fs.teamB
    return arr[slot.slotIndex] ?? null
  }

  function setUidAtSlot(
    fsList: typeof foursomes,
    slot: SlotRef,
    uid: string | null,
  ): typeof foursomes {
    return fsList.map((fs, fi) => {
      if (fi !== slot.foursomeIndex) return fs
      const arr = slot.team === 'A' ? [...fs.teamA] : [...fs.teamB]
      if (uid === null) arr.splice(slot.slotIndex, 1)
      else arr[slot.slotIndex] = uid
      return slot.team === 'A' ? { ...fs, teamA: arr } : { ...fs, teamB: arr }
    })
  }

  function handleSlotClick(slot: SlotRef) {
    const uid = getUidAtSlot(slot)

    if (selectedSlot === null && selectedUnassignedUid === null) {
      // Nothing selected yet — select this slot
      setSelectedSlot(slot)
      setSelectedUnassignedUid(null)
      return
    }

    if (selectedUnassignedUid !== null) {
      // Unassigned player → drop into this slot
      if (uid === null) {
        // Empty slot: just place the unassigned player here
        const updated = setUidAtSlot(foursomes, slot, selectedUnassignedUid)
        const allA = updated.flatMap((fs) => fs.teamA)
        const allB = updated.flatMap((fs) => fs.teamB)
        onChange({ ...value!, foursomes: updated, teamA: allA, teamB: allB })
      } else {
        // Filled slot: swap — move slot occupant to unassigned (remove from foursomes), place unassigned player in slot
        let updated = setUidAtSlot(foursomes, slot, selectedUnassignedUid)
        // uid now becomes unassigned — it's already not in foursomes after the replace, nothing more to do
        void uid // uid is now effectively unassigned
        const allA = updated.flatMap((fs) => fs.teamA)
        const allB = updated.flatMap((fs) => fs.teamB)
        onChange({ ...value!, foursomes: updated, teamA: allA, teamB: allB })
      }
      setSelectedUnassignedUid(null); setSelectedSlot(null)
      return
    }

    if (selectedSlot !== null) {
      // Slot-to-slot swap
      const isSameSlot = selectedSlot.foursomeIndex === slot.foursomeIndex &&
        selectedSlot.team === slot.team && selectedSlot.slotIndex === slot.slotIndex
      if (isSameSlot) { setSelectedSlot(null); return }

      const uidA = getUidAtSlot(selectedSlot)
      const uidB = uid

      let updated = [...foursomes]
      updated = setUidAtSlot(updated, selectedSlot, uidB)
      updated = setUidAtSlot(updated, slot, uidA)
      // Remove any nulls left in arrays
      updated = updated.map((fs) => ({
        teamA: fs.teamA.filter(Boolean),
        teamB: fs.teamB.filter(Boolean),
      }))
      const allA = updated.flatMap((fs) => fs.teamA)
      const allB = updated.flatMap((fs) => fs.teamB)
      onChange({ ...value!, foursomes: updated, teamA: allA, teamB: allB })
      setSelectedSlot(null)
    }
  }

  function handleUnassignedClick(uid: string) {
    if (selectedUnassignedUid === uid) { setSelectedUnassignedUid(null); return }

    if (selectedSlot !== null) {
      // Swap: move slot occupant out (unassigned), place uid in slot
      const occupant = getUidAtSlot(selectedSlot)
      let updated = setUidAtSlot(foursomes, selectedSlot, uid)
      // Remove occupant's uid if it was placed (occupant becomes unassigned automatically since not in foursomes)
      void occupant
      updated = updated.map((fs) => ({
        teamA: fs.teamA.filter(Boolean),
        teamB: fs.teamB.filter(Boolean),
      }))
      const allA = updated.flatMap((fs) => fs.teamA)
      const allB = updated.flatMap((fs) => fs.teamB)
      onChange({ ...value!, foursomes: updated, teamA: allA, teamB: allB })
      setSelectedSlot(null); setSelectedUnassignedUid(null)
      return
    }

    setSelectedUnassignedUid(uid)
    setSelectedSlot(null)
  }

  const isTeams = value.teamFormat !== 'INDIVIDUAL'
  const matchTypeOptions = MATCH_TYPES_BY_FORMAT[value.teamFormat]

  // All uids placed in foursomes
  const placedUids = new Set(foursomes.flatMap((fs) => [...fs.teamA, ...fs.teamB]))
  // Unassigned = members with a team assignment (A or B) but not yet in a foursome
  const teamAUids = new Set(value.teamA ?? [])
  const teamBUids = new Set(value.teamB ?? [])
  const unassigned = roundMembers.filter(
    (m) => (teamAUids.has(m.uid) || teamBUids.has(m.uid)) && !placedUids.has(m.uid),
  )

  // Fairness — across all assigned team members
  const assignedA = roundMembers.filter((m) => teamAUids.has(m.uid))
  const assignedB = roundMembers.filter((m) => teamBUids.has(m.uid))
  const fairness = assignedA.length > 0 && assignedB.length > 0
    ? evaluateTeamFairness(assignedA, assignedB)
    : null


  return (
    <Card className="p-4 flex flex-col gap-4 border-brand/30">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand">Match</h3>
        <button type="button" onClick={() => onChange(null)}
          className="text-xs bg-danger text-white px-2 py-1 rounded-lg font-medium hover:bg-danger-hover transition-colors">
          Remove Match
        </button>
      </div>

      {/* Teams — Yes / No */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-brand">Teams</span>
        <div className="flex gap-2">
          {(['No', 'Yes'] as const).map((label) => {
            const wantsTeams = label === 'Yes'
            const active = isTeams === wantsTeams
            return (
              <button key={label} type="button"
                onClick={() => handleTeamFormatChange(wantsTeams ? 'H2H_2V2' : 'INDIVIDUAL')}
                style={active ? undefined : inactiveStyle}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${toggleClass(active)}`}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Team Format */}
      {isTeams && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-brand">Team Format</span>
          <div className="flex flex-col gap-1.5">
            {TEAM_FORMAT_OPTIONS.map((opt) => {
              const active = value.teamFormat === opt.value
              return (
                <button key={opt.value} type="button"
                  onClick={() => handleTeamFormatChange(opt.value)}
                  style={active ? undefined : inactiveStyle}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border text-left transition-colors ${toggleClass(active)}`}>
                  <span>{opt.label}</span>
                  {!active && <span className="block text-xs font-normal text-muted mt-0.5">{opt.description}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Scoring */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-brand">Scoring</span>
        <div className="flex gap-2">
          {(['GROSS', 'NET'] as const).map((s) => (
            <button key={s} type="button" onClick={() => handleScoringChange(s)}
              style={value.scoring === s ? undefined : inactiveStyle}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${toggleClass(value.scoring === s)}`}>
              {s === 'GROSS' ? 'Gross' : 'Net'}
            </button>
          ))}
        </div>
      </div>

      {/* Handicap Percent */}
      {value.scoring === 'NET' && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-brand">Handicap Percent</label>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="100" step="1"
              value={value.handicapPercent ?? 80}
              onChange={(e) => set('handicapPercent', Number(e.target.value))}
              className="w-24 bg-white border border-card-border rounded-lg px-3 py-2 text-sm text-brand focus:outline-none focus:ring-2 focus:ring-brand" />
            <span className="text-sm text-muted">%</span>
          </div>
          <p className="text-xs text-muted">Portion of handicap applied to net scores.</p>
        </div>
      )}

      {/* Match Type */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-brand">Match Type</span>
        <div className="flex flex-col gap-1.5">
          {matchTypeOptions.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => set('matchType', opt.value as MatchFormValues['matchType'])}
              style={value.matchType === opt.value ? undefined : inactiveStyle}
              className={`py-2 px-3 rounded-lg text-sm font-medium border text-left transition-colors ${toggleClass(value.matchType === opt.value)}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Team Builder */}
      {isTeams && (
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-brand">Team Builder</span>
              {fairness && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FAIRNESS_STYLES[fairness]}`}>
                  {fairness}
                </span>
              )}
            </div>
            {roundMembers.length > 0 && (
              <button type="button" onClick={handleAutoBuild}
                className="text-xs bg-danger text-white px-2 py-1 rounded-lg font-medium hover:bg-danger-hover transition-colors shrink-0">
                Generate Fairest Teams
              </button>
            )}
          </div>

          <p className="text-xs font-semibold text-center" style={{ color: '#C4B47A' }}>Tap players to swap</p>

          {/* Overall team averages */}
          {(assignedA.length > 0 || assignedB.length > 0) && (() => {
            const avg = (members: RoundMember[]) => {
              const hcps = members.map((m) => m.handicap).filter((h): h is number => h != null)
              return hcps.length > 0 ? (hcps.reduce((s, h) => s + h, 0) / hcps.length).toFixed(1) : '—'
            }
            return (
              <div className="grid grid-cols-2 gap-2">
                {(['A', 'B'] as const).map((team) => {
                  const members = team === 'A' ? assignedA : assignedB
                  return (
                    <div key={team} className={`rounded-lg px-3 py-1.5 text-xs flex items-center justify-between ${team === 'A' ? 'bg-brand/15 border border-brand/30' : 'bg-danger/15 border border-danger/30'}`}>
                      <span className={`font-semibold ${team === 'A' ? 'text-brand' : 'text-danger'}`}>
                        Team {team}
                      </span>
                      <span className={team === 'A' ? 'text-brand' : 'text-danger'}>AVG GHIN {avg(members)}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          <div className="bg-[#3A6280] rounded-lg p-3 flex flex-col gap-3">
            {roundMembers.length === 0 ? (
              <p className="text-xs text-white/70 italic">
                You can assign teams after players have joined the round.
              </p>
            ) : (
              <>
                {/* Foursome cards */}
                {foursomes.map((fs, fi) => (
                  <div key={fi} className="bg-white/10 rounded-lg p-2 flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                      Group {fi + 1}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['A', 'B'] as const).map((team) => {
                        const slots = team === 'A' ? fs.teamA : fs.teamB
                        const displaySlots = Array.from({ length: 2 }, (_, si) => slots[si] ?? null)
                        const groupMembers = slots
                          .map((uid) => roundMembers.find((m) => m.uid === uid))
                          .filter((m): m is RoundMember => m != null)
                        const hcps = groupMembers.map((m) => m.handicap).filter((h): h is number => h != null)
                        const avg = hcps.length > 0
                          ? (hcps.reduce((s, h) => s + h, 0) / hcps.length).toFixed(1)
                          : null
                        return (
                          <div key={team} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-semibold uppercase tracking-wide ${team === 'A' ? 'text-blue-300' : 'text-red-300'}`}>
                                Team {team}
                              </span>
                              {avg !== null && (
                                <span className="text-xs text-white/50">AVG GHIN {avg}</span>
                              )}
                            </div>
                            {displaySlots.map((uid, si) => {
                              const member = uid ? roundMembers.find((m) => m.uid === uid) : null
                              const isSelected = selectedSlot?.foursomeIndex === fi &&
                                selectedSlot?.team === team && selectedSlot?.slotIndex === si
                              return (
                                <button
                                  key={si}
                                  type="button"
                                  onClick={() => handleSlotClick({ foursomeIndex: fi, team, slotIndex: si })}
                                  style={
                                    isSelected
                                      ? { backgroundColor: '#C4B47A', color: '#1a1a1a' }
                                      : undefined
                                  }
                                  className={`w-full text-left rounded px-2 py-1 text-xs transition-colors border ${
                                    isSelected
                                      ? 'border-transparent'
                                      : member
                                        ? team === 'A'
                                          ? 'bg-brand/20 text-white border-brand/30 hover:bg-brand/30'
                                          : 'bg-danger/20 text-white border-danger/30 hover:bg-danger/30'
                                        : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'
                                  }`}
                                >
                                  {member ? (
                                    <>
                                      <div className="font-medium">{member.displayName}</div>
                                      <div className={isSelected ? '' : 'text-white/60'}>
                                        {member.handicap != null ? `HCP ${member.handicap}` : 'No HCP'}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="italic">Empty slot</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Unassigned players */}
                {unassigned.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                      Unassigned
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {unassigned.map((m) => {
                        const isSelected = selectedUnassignedUid === m.uid
                        const isTeamA = teamAUids.has(m.uid)
                        return (
                          <button key={m.uid} type="button"
                            onClick={() => handleUnassignedClick(m.uid)}
                            className={`text-left rounded-lg px-2 py-1.5 text-xs border transition-colors ${
                              isSelected
                                ? 'border-transparent'
                                : isTeamA
                                  ? 'bg-brand/20 text-white border-brand/30 hover:bg-brand/30'
                                  : 'bg-danger/20 text-white border-danger/30 hover:bg-danger/30'
                            }`}
                            style={isSelected ? { backgroundColor: '#C4B47A', color: '#1a1a1a' } : undefined}>
                            <div className="font-medium">{m.displayName}</div>
                            <div className={isSelected ? '' : 'text-white/60'}>
                              {m.handicap != null ? `HCP ${m.handicap}` : 'No HCP'}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Players with no team assigned yet */}
                {(() => {
                  const noTeam = roundMembers.filter(
                    (m) => !teamAUids.has(m.uid) && !teamBUids.has(m.uid),
                  )
                  if (noTeam.length === 0) return null
                  return (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                        No Team Assigned
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {noTeam.map((m) => (
                          <div key={m.uid}
                            className="flex items-center justify-between bg-btn-secondary rounded-lg px-2 py-1.5 text-xs text-brand">
                            <div>
                              <div>{m.displayName}</div>
                              <div className="text-muted">
                                {m.handicap != null ? `HCP ${m.handicap}` : 'No HCP'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-1 shrink-0">
                              <button type="button"
                                onClick={() => {
                                  const newA = [...(value.teamA ?? []), m.uid]
                                  onChange({ ...value!, teamA: newA })
                                }}
                                className="bg-brand text-white text-xs font-semibold px-2 py-0.5 rounded hover:bg-brand-hover transition-colors"
                                title="Add to Team A">A</button>
                              <button type="button"
                                onClick={() => {
                                  const newB = [...(value.teamB ?? []), m.uid]
                                  onChange({ ...value!, teamB: newB })
                                }}
                                className="bg-danger text-white text-xs font-semibold px-2 py-0.5 rounded hover:bg-danger-hover transition-colors"
                                title="Add to Team B">B</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
