import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScore } from '@/hooks/useScore'
import { scoreService } from '@/services/scoreService'
import { groupService } from '@/services/groupService'
import { ScorecardGrid } from '@/components/scorecard/ScorecardGrid'
import { Spinner, Alert, Button } from '@/components/ui'

export function SigningPage() {
  const { roundId, groupId } = useParams<{ roundId: string; groupId: string }>()
  const { currentUser } = useAuth()
  const { ctx, loading } = useScore(roundId!, groupId!)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!ctx) return <Alert message="Round not found." />

  const uid = currentUser!.uid
  const { round, group, scores, tee } = ctx
  const isScramble = round.scoringFormat === 'scramble'
  const isNet = round.roundType.includes('NET')

  // Scramble: one shared score doc — signed when that doc is locked
  const scrambleScore = isScramble ? scores[0] : undefined
  const allSigned = isScramble
    ? (scrambleScore?.isLocked ?? false)
    : scores.filter((s) => s.isLocked).length === group.golferIds.length

  async function handleSign() {
    setSigning(true)
    setError('')
    try {
      const scoreUid = isScramble ? (scrambleScore?.golferId ?? uid) : uid
      await scoreService.signScore(roundId!, groupId!, scoreUid, uid)
      await groupService.checkAndCompleteGroup(roundId!, groupId!)
      navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`)
    } catch (e) {
      setError((e as Error).message)
      setSigning(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(`/rounds/${roundId}/groups/${groupId}/scorecard`)}
        className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-sm transition-colors"
      >
        Back to Round
      </button>

      {/* Header + signing actions */}
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <div className="p-4">
          <h1 className="text-xl font-bold text-brand">Sign Scorecard</h1>
          <p className="text-muted text-sm mt-0.5">{round.courseName} · {round.teeName}</p>
        </div>
        {!allSigned && (
          <div className="border-t border-card-border">
            {isScramble ? (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-semibold text-brand text-sm">{scrambleScore?.golferName ?? group.name ?? 'Team'}</span>
                <Button size="sm" loading={signing} onClick={handleSign}>
                  Sign Scorecard
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-card-border">
                {scores.map((sc) => (
                  <div key={sc.golferId} className="flex items-center justify-between px-4 py-3">
                    <span className="font-semibold text-brand text-sm">{sc.golferName}</span>
                    {sc.isLocked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-danger text-xl" style={{ fontFamily: "'Dancing Script', cursive" }}>
                          {sc.golferName}
                        </span>
                        <svg className="w-5 h-5 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    ) : sc.golferId === uid ? (
                      <Button size="sm" loading={signing} onClick={handleSign}>
                        Sign My Card
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">Awaiting signature</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && <Alert message={error} />}

      {allSigned ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="text-5xl">✓</div>
          <p className="text-xl font-bold text-brand">All Signed!</p>
          <p className="text-muted text-sm">Scores are locked.</p>
          <Button onClick={() => navigate(`/rounds/${roundId}/summary`)}>
            View Summary
          </Button>
        </div>
      ) : (
        <>
          {/* Aggregate scorecard */}
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
            <div className="p-4">
              <ScorecardGrid scores={scores} holes={tee.holes} isNet={isNet} bare fullNames={isScramble} />
            </div>
          </div>

          <p className="text-xs text-muted text-center px-2">
            Round chat is automatically deleted 7 days after the round ends.
          </p>
        </>
      )}
    </div>
  )
}
