import { useParams, Link } from 'react-router-dom'
import { useRound } from '@/hooks/useRound'
import { useGroups } from '@/hooks/useGroup'
import { courseService } from '@/services/courseService'
import { scoreService } from '@/services/scoreService'
import { useEffect, useState } from 'react'
import type { Score, Tee } from '@/types'
import { ScorecardGrid } from '@/components/scorecard/ScorecardGrid'
import { Card, Spinner } from '@/components/ui'
import { formatVsPar, calculateTotalVsPar, calculateTotalNetVsPar } from '@/lib/scoring'

export function RoundSummaryPage() {
  const { roundId } = useParams<{ roundId: string }>()
  const { round, loading: roundLoading } = useRound(roundId!)
  const { groups, loading: groupsLoading } = useGroups(roundId!)
  const [allScores, setAllScores] = useState<Score[]>([])
  const [tee, setTee] = useState<Tee | null>(null)

  useEffect(() => {
    if (!round) return
    courseService.getCourse(round.courseId).then((c) => {
      const t = c?.tees.find((t) => t.teeId === round.teeId)
      if (t) setTee(t)
    })
  }, [round])

  useEffect(() => {
    if (groups.length === 0) return
    Promise.all(
      groups.map((g) => scoreService.getAllScores(roundId!, g.groupId))
    ).then((results) => {
      setAllScores(results.flat())
    })
  }, [groups, roundId])

  if (roundLoading || groupsLoading || !round || !tee) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  const isNet = round.roundType === 'STROKE_NET' || round.roundType === 'BEST_BALL_NET'

  const leaderboard = [...allScores].sort((a, b) => {
    const aScore = isNet ? (a.totalNet ?? 999) : (a.totalGross ?? 999)
    const bScore = isNet ? (b.totalNet ?? 999) : (b.totalGross ?? 999)
    return aScore - bScore
  })

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white">{round.name} — Summary</h2>

      <Card className="p-4">
        <h3 className="font-semibold text-gray-400 mb-3">Leaderboard</h3>
        <div className="flex flex-col gap-2">
          {leaderboard.map((sc, i) => {
            const total = isNet ? sc.totalNet : sc.totalGross
            const vsPar = isNet
              ? calculateTotalNetVsPar(sc.scores, tee.holes)
              : calculateTotalVsPar(sc.scores, tee.holes)
            return (
              <div key={sc.golferId} className={`flex items-center justify-between py-2 ${i === 0 ? 'font-bold text-green-400' : 'text-white'}`}>
                <span className="flex items-center gap-2">
                  <span className="text-lg">{i === 0 ? '🏆' : `${i + 1}.`}</span>
                  {sc.golferName}
                </span>
                <span className="text-right">
                  <span className="font-mono">{total ?? '-'}</span>
                  <span className="ml-2 text-sm text-gray-500">({formatVsPar(vsPar)})</span>
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      <ScorecardGrid scores={allScores} holes={tee.holes} isNet={isNet} />

      <Link to="/" className="text-center text-green-400 font-semibold hover:text-green-300">
        Back to Tee Sheet
      </Link>
    </div>
  )
}
