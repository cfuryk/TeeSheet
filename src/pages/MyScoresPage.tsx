import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useMyScores } from '@/hooks/useMyScores'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, Card, Badge } from '@/components/ui'
import { formatDate, formatHandicap } from '@/lib/formatters'

function useScorecardLink(roundId: string | null, uid: string | undefined) {
  const [link, setLink] = useState<string | null>(null)
  useEffect(() => {
    if (!roundId || !uid) return
    getDocs(query(collection(db, 'rounds', roundId, 'groups'), where('golferIds', 'array-contains', uid)))
      .then((snap) => {
        if (!snap.empty) setLink(`/rounds/${roundId}/groups/${snap.docs[0].id}/sign`)
      })
      .catch(() => {})
  }, [roundId, uid])
  return link
}

function ScorecardLink({ roundId, uid }: { roundId: string; uid: string }) {
  const link = useScorecardLink(roundId, uid)
  if (!link) return null
  return (
    <Link to={link} className="inline-flex items-center text-xs font-semibold text-white bg-danger hover:bg-danger/90 px-3 h-8 rounded-lg transition-colors">
      View Scorecard
    </Link>
  )
}

export function MyScoresPage() {
  const { scores, loading } = useMyScores()
  const { currentUser } = useAuth()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-brand">My Scores</h1>

      {loading ? (
        <div className="flex items-center justify-center pt-8">
          <Spinner />
        </div>
      ) : scores.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted">No scores recorded yet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {scores.map((s) => (
            <div key={s.scoreId} className="bg-card-bg border border-card-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="font-semibold text-brand truncate">{s.courseName}</p>
                  <p className="text-sm text-muted truncate">{s.teeName}</p>
                  <p className="text-xs text-muted mt-1">{formatDate(s.date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-2xl font-bold text-brand">{s.grossScore}</span>
                  {s.netScore != null && (
                    <span className="text-sm text-muted">Net {s.netScore}</span>
                  )}
                  <Badge label={s.source === 'simple' ? 'Standalone' : 'Full Round'} variant={s.source === 'simple' ? 'tan' : 'blue'} />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-card-border flex items-center justify-between">
                <p className="text-xs text-muted">
                  Differential: <span className="text-brand">{formatHandicap(s.differential)}</span>
                </p>
                {s.source === 'full' && s.roundId && currentUser && (
                  <ScorecardLink roundId={s.roundId} uid={currentUser.uid} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
