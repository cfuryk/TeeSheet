import { roundTypeLabel } from '@/lib/formatters'
import { Badge } from '@/components/ui'
import type { RoundType } from '@/types'

const variantMap: Record<RoundType, 'green' | 'blue' | 'gray'> = {
  STROKE_GROSS: 'gray',
  STROKE_NET: 'green',
  BEST_BALL_GROSS: 'blue',
  BEST_BALL_NET: 'green',
  TWO_TEAM_STROKE_GROSS: 'gray',
  TWO_TEAM_STROKE_NET: 'green',
  TWO_TEAM_BB_MATCH_GROSS: 'blue',
  TWO_TEAM_BB_MATCH_NET: 'green',
  TWO_TEAM_BB_STROKE_GROSS: 'blue',
  TWO_TEAM_BB_STROKE_NET: 'green',
}

export function RoundTypeLabel({ roundType }: { roundType: RoundType }) {
  return <Badge label={roundTypeLabel(roundType)} variant={variantMap[roundType]} />
}
