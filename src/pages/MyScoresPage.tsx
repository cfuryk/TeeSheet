import { useMyScores } from '@/hooks/useMyScores'
import { Spinner, Card, Badge } from '@/components/ui'
import { formatDate, formatHandicap } from '@/lib/formatters'

export function MyScoresPage() {
  const { scores, loading } = useMyScores()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">My Scores</h1>

      {loading ? (
        <div className="flex items-center justify-center pt-8">
          <Spinner />
        </div>
      ) : scores.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-400">No scores recorded yet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {scores.map((s) => (
            <div key={s.scoreId} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="font-semibold text-white truncate">{s.courseName}</p>
                  <p className="text-sm text-gray-400 truncate">{s.teeName}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(s.date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-2xl font-bold text-white">{s.grossScore}</span>
                  {s.netScore != null && (
                    <span className="text-sm text-gray-400">Net {s.netScore}</span>
                  )}
                  <Badge label={s.source === 'simple' ? 'Simple' : 'Full Round'} variant="gray" />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-500">
                  Differential: <span className="text-gray-300">{formatHandicap(s.differential)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
