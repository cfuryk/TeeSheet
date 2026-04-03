import type { Hole } from '@/types'
import { Card } from '@/components/ui'

export function HoleInfo({ hole }: { hole: Hole }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Hole</p>
          <p className="text-5xl font-black text-green-400">{hole.number}</p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Par</p>
            <p className="text-3xl font-bold text-white">{hole.par}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Yards</p>
            <p className="text-3xl font-bold text-white">{hole.yardage}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">HCP</p>
            <p className="text-3xl font-bold text-white">{hole.handicap}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
