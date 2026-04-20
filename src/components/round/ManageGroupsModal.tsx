import { useState, useEffect } from 'react'
import type { Group } from '@/types'
import type { UserProfile } from '@/types'
import { userService } from '@/services/userService'
import { groupService } from '@/services/groupService'
import { Button } from '@/components/ui'

interface Props {
  roundId: string
  groups: Group[]
  onClose: () => void
  isScramble?: boolean
  memberProfiles?: Record<string, UserProfile>
  eventHandicaps?: Record<string, number>
}

interface Selection {
  golferId: string
  groupId: string
}

// ---------------------------------------------------------------------------
// Scramble fairness helpers
// ---------------------------------------------------------------------------

type FairnessRating = 'Great' | 'Good' | 'Fair' | 'Poor'

const FAIRNESS_STYLES: Record<FairnessRating, string> = {
  Great: 'bg-green-500 text-white',
  Good:  'bg-blue-400 text-white',
  Fair:  'bg-yellow-400 text-black',
  Poor:  'bg-danger text-white',
}

const RATING_ORDER: FairnessRating[] = ['Great', 'Good', 'Fair', 'Poor']

function getHandicap(uid: string, profiles: Record<string, UserProfile>, eventHandicaps?: Record<string, number>): number | null {
  if (eventHandicaps && uid in eventHandicaps) return eventHandicaps[uid]
  return profiles[uid]?.teeSheetHandicap ?? null
}

function groupAvgHandicap(uids: string[], profiles: Record<string, UserProfile>, eventHandicaps?: Record<string, number>): number | null {
  const hcps = uids.map((uid) => getHandicap(uid, profiles, eventHandicaps)).filter((h): h is number => h != null)
  if (hcps.length === 0) return null
  return hcps.reduce((s, h) => s + h, 0) / hcps.length
}

function overallAvgHandicap(allUids: string[], profiles: Record<string, UserProfile>, eventHandicaps?: Record<string, number>): number | null {
  const hcps = allUids.map((uid) => getHandicap(uid, profiles, eventHandicaps)).filter((h): h is number => h != null)
  if (hcps.length === 0) return null
  return hcps.reduce((s, h) => s + h, 0) / hcps.length
}

function evaluateGroupFairness(groupAvg: number, overallAvg: number): FairnessRating {
  if (overallAvg === 0) return 'Great'
  const deviation = Math.abs(groupAvg - overallAvg) / overallAvg
  if (deviation <= 0.05) return 'Great'
  if (deviation <= 0.10) return 'Good'
  if (deviation <= 0.15) return 'Fair'
  return 'Poor'
}

function worstRating(ratings: (FairnessRating | null)[]): FairnessRating | null {
  const valid = ratings.filter((r): r is FairnessRating => r != null)
  if (valid.length === 0) return null
  return valid.reduce((worst, r) => {
    return RATING_ORDER.indexOf(r) > RATING_ORDER.indexOf(worst) ? r : worst
  })
}

/**
 * Snake-distribute members sorted by handicap into numGroups, then
 * swap-optimize to minimize variance of group averages.
 * Returns one uid[] per group (same order as input groups array).
 */
function buildBalancedGroups(
  members: { uid: string; handicap: number | null }[],
  numGroups: number,
): string[][] {
  if (numGroups === 0) return []
  // Sort: nulls treated as 0 for snake placement, pushed to last positions
  const withHcp = members.filter((m) => m.handicap != null).sort((a, b) => (a.handicap ?? 0) - (b.handicap ?? 0))
  const withoutHcp = members.filter((m) => m.handicap == null)
  const sorted = [...withHcp, ...withoutHcp]

  const buckets: { uid: string; handicap: number | null }[][] = Array.from({ length: numGroups }, () => [])

  // Snake assignment
  sorted.forEach((member, i) => {
    const row = Math.floor(i / numGroups)
    const col = i % numGroups
    const groupIdx = row % 2 === 0 ? col : numGroups - 1 - col
    buckets[groupIdx].push(member)
  })

  // Swap-optimize: reduce sum of squared deviations from overall avg
  const hcpAvg = (bucket: { uid: string; handicap: number | null }[]) => {
    const hcps = bucket.map((m) => m.handicap ?? 0)
    return hcps.length > 0 ? hcps.reduce((s, h) => s + h, 0) / hcps.length : 0
  }
  const sumSquaredDev = () => {
    const avgs = buckets.map(hcpAvg)
    const overall = avgs.reduce((s, a) => s + a, 0) / avgs.length
    return avgs.reduce((s, a) => s + (a - overall) ** 2, 0)
  }

  let improved = true
  while (improved) {
    improved = false
    for (let gi = 0; gi < buckets.length; gi++) {
      for (let gj = gi + 1; gj < buckets.length; gj++) {
        for (let pi = 0; pi < buckets[gi].length; pi++) {
          for (let pj = 0; pj < buckets[gj].length; pj++) {
            const before = sumSquaredDev()
            // Swap
            const tmp = buckets[gi][pi]; buckets[gi][pi] = buckets[gj][pj]; buckets[gj][pj] = tmp
            const after = sumSquaredDev()
            if (after < before - 1e-9) {
              improved = true
            } else {
              // Swap back
              const tmp2 = buckets[gi][pi]; buckets[gi][pi] = buckets[gj][pj]; buckets[gj][pj] = tmp2
            }
          }
        }
      }
    }
  }

  return buckets.map((b) => b.map((m) => m.uid))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManageGroupsModal({ roundId, groups, onClose, isScramble, memberProfiles = {}, eventHandicaps }: Props) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>(memberProfiles)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [swapping, setSwapping] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    // If parent didn't supply profiles (non-scramble path), fetch them
    if (Object.keys(memberProfiles).length > 0) {
      setProfiles(memberProfiles)
      return
    }
    const allIds = [...new Set(groups.flatMap((g) => g.golferIds))]
    Promise.all(allIds.map((uid) => userService.getProfile(uid).then((p) => ({ uid, p })))).then(
      (results) => {
        const map: Record<string, UserProfile> = {}
        for (const { uid, p } of results) {
          if (p) map[uid] = p
        }
        setProfiles(map)
      },
    )
  }, [groups, memberProfiles])

  // Keep profiles in sync if parent's map updates
  useEffect(() => {
    if (Object.keys(memberProfiles).length > 0) setProfiles(memberProfiles)
  }, [memberProfiles])

  async function handleTap(golferId: string, groupId: string) {
    if (swapping || generating) return
    setError('')

    if (!selected) {
      setSelected({ golferId, groupId })
      return
    }

    if (selected.golferId === golferId) {
      setSelected(null)
      return
    }

    setSwapping(true)
    try {
      await groupService.swapGolfers(roundId, selected, { golferId, groupId })
    } catch {
      setError('Failed to swap players.')
    } finally {
      setSwapping(false)
      setSelected(null)
    }
  }

  async function handleSaveName(groupId: string) {
    const trimmed = editingName.trim()
    if (!trimmed) return
    setSavingName(true)
    try {
      await groupService.updateGroupName(roundId, groupId, trimmed)
    } catch {
      setError('Failed to rename group.')
    } finally {
      setSavingName(false)
      setEditingGroupId(null)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setSelected(null)
    try {
      const allUids = groups.flatMap((g) => g.golferIds)
      const members = allUids.map((uid) => ({ uid, handicap: getHandicap(uid, profiles, eventHandicaps) }))
      const newAssignments = buildBalancedGroups(members, groups.length)
      await groupService.rebalanceGroups(
        roundId,
        groups.map((g, i) => ({ groupId: g.groupId, golferIds: newAssignments[i] ?? [] })),
      )
    } catch {
      setError('Failed to generate groups.')
    } finally {
      setGenerating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Scramble fairness computations (reactive on groups + profiles)
  // ---------------------------------------------------------------------------
  const allUids = groups.flatMap((g) => g.golferIds)
  const overall = isScramble ? overallAvgHandicap(allUids, profiles, eventHandicaps) : null

  const groupStats = groups.map((g) => {
    const avg = isScramble ? groupAvgHandicap(g.golferIds, profiles, eventHandicaps) : null
    const fairness = isScramble && avg != null && overall != null
      ? evaluateGroupFairness(avg, overall)
      : null
    return { avg, fairness }
  })

  const overallFairness = isScramble
    ? worstRating(groupStats.map((s) => s.fairness))
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4">
      <div className="w-full max-w-lg bg-white border border-card-border rounded-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-card-border shrink-0">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-brand text-lg">Manage Groups</h2>
              {overallFairness && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FAIRNESS_STYLES[overallFairness]}`}>
                  {overallFairness}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              {selected
                ? `${profiles[selected.golferId]?.displayName ?? '…'} selected — tap another player to swap`
                : 'Tap a player to select, then tap another to swap'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {isScramble && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || swapping}
                className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {generating ? 'Generating…' : 'Generate Balanced Groups'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-brand transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {error && <p className="text-sm text-danger">{error}</p>}

          {groups.map((group, gi) => {
            const { avg, fairness } = groupStats[gi]
            return (
              <div key={group.groupId} className="bg-card-bg border border-card-border rounded-xl p-3">
                {/* Group header */}
                <div className="flex items-center justify-between mb-2">
                  {editingGroupId === group.groupId ? (
                    <div className="flex items-center gap-1 flex-1 mr-2">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(group.groupId)
                          if (e.key === 'Escape') setEditingGroupId(null)
                        }}
                        disabled={savingName}
                        className="flex-1 text-sm font-semibold border border-brand rounded px-2 py-0.5 text-brand focus:outline-none"
                        maxLength={40}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveName(group.groupId)}
                        disabled={savingName}
                        className="text-xs bg-brand text-white px-2 py-0.5 rounded font-semibold disabled:opacity-50"
                      >
                        {savingName ? '…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingGroupId(null)}
                        className="text-xs text-muted hover:text-brand px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingGroupId(group.groupId); setEditingName(group.name ?? `Group ${gi + 1}`) }}
                      className="font-semibold text-brand text-left hover:underline flex items-center gap-1"
                      title="Rename group"
                    >
                      {group.name ?? `Group ${gi + 1}`}
                      <svg className="w-3 h-3 text-brand/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z" />
                      </svg>
                    </button>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {avg != null && (
                      <span className="text-xs text-muted">AVG GHIN {avg.toFixed(1)}</span>
                    )}
                    {fairness && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FAIRNESS_STYLES[fairness]}`}>
                        {fairness}
                      </span>
                    )}
                  </div>
                </div>

                {group.golferIds.length === 0 ? (
                  <p className="text-xs text-muted">No players</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {group.golferIds.map((gid) => {
                      const isSelected = selected?.golferId === gid
                      const name = profiles[gid]?.displayName ?? '…'
                      const hcp = getHandicap(gid, profiles, eventHandicaps)
                      return (
                        <button
                          key={gid}
                          type="button"
                          onClick={() => handleTap(gid, group.groupId)}
                          disabled={swapping || generating}
                          className={[
                            'px-3 py-2 rounded-lg text-xs font-semibold truncate transition-colors text-left flex flex-col gap-0.5',
                            isSelected
                              ? 'ring-2 ring-offset-1'
                              : 'bg-brand/10 text-brand hover:bg-brand/20',
                            swapping || generating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                          ].join(' ')}
                          style={isSelected ? { backgroundColor: '#C4B47A', color: '#1a1a1a' } : undefined}
                        >
                          <span className="truncate">{name}</span>
                          {isScramble && (
                            <span className={`font-normal ${isSelected ? '' : 'text-brand/60'}`}>
                              {hcp != null ? `HCP ${hcp}` : 'No HCP'}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-card-border shrink-0">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
