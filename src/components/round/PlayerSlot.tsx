import { useState, useEffect } from 'react'
import { userService } from '@/services/userService'
import type { UserProfile } from '@/types'
import { formatHandicap } from '@/lib/formatters'

interface Props {
  golferId: string | null
  isCreator?: boolean
  fallbackName?: string
  score?: number | null
  holesPlayed?: number
}

export function PlayerSlot({ golferId, isCreator = false, fallbackName, score, holesPlayed }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (golferId) userService.getProfile(golferId).then(setProfile)
  }, [golferId])

  if (!golferId) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-700 text-gray-600">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-600 text-lg">
          +
        </div>
        <span className="text-sm">Open</span>
      </div>
    )
  }

  const displayName = profile?.displayName ?? fallbackName
  const initial = displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800 border border-gray-700">
      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white">{displayName ?? 'Loading...'}</p>
        <p className="text-xs text-gray-400">
          {profile ? `HCP: ${profile.teeSheetHandicap != null ? formatHandicap(profile.teeSheetHandicap) : '—'}` : ''}
          {isCreator && <span className="ml-2 text-green-400">Host</span>}
        </p>
      </div>
      {score !== undefined && score !== null && (
        <div className="text-right shrink-0">
          <p className="font-mono font-bold text-white">{score}</p>
          {holesPlayed !== undefined && holesPlayed < 18 && (
            <p className="text-xs text-gray-500">Thru {holesPlayed}</p>
          )}
        </div>
      )}
    </div>
  )
}
