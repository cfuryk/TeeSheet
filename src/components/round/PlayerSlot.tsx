import { useState, useEffect } from 'react'
import { userService } from '@/services/userService'
import type { UserProfile } from '@/types'
import { formatHandicap } from '@/lib/formatters'

interface Props {
  golferId: string | null
  isCreator?: boolean
  fallbackName?: string
  handicap?: number | null
  score?: number | null
  holesPlayed?: number
}

export function PlayerSlot({ golferId, isCreator = false, fallbackName, handicap, score, holesPlayed }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (golferId) userService.getProfile(golferId).then(setProfile)
  }, [golferId])

  if (!golferId) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-card-border text-muted">
        <div className="w-10 h-10 rounded-full bg-card-bg flex items-center justify-center text-muted text-lg">
          +
        </div>
        <span className="text-sm">Open</span>
      </div>
    )
  }

  const displayName = profile?.displayName ?? fallbackName
  const initial = displayName?.[0]?.toUpperCase() ?? '?'
  // Use explicitly passed handicap when provided, otherwise fall back to profile
  const displayHandicap = handicap !== undefined ? handicap : (profile?.teeSheetHandicap ?? null)

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card-bg border border-card-border">
      <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-brand">{displayName ?? 'Loading...'}</p>
        <p className="text-xs text-muted">
          {`HCP: ${displayHandicap != null ? formatHandicap(displayHandicap) : '—'}`}
          {isCreator && <span className="ml-2 text-brand">Host</span>}
        </p>
      </div>
      {score !== undefined && score !== null && (
        <div className="text-right shrink-0">
          <p className="font-mono font-bold text-brand">{score}</p>
          {holesPlayed !== undefined && holesPlayed < 18 && (
            <p className="text-xs text-muted">Thru {holesPlayed}</p>
          )}
        </div>
      )}
    </div>
  )
}
