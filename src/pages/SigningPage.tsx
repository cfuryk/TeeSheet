import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScore } from '@/hooks/useScore'
import { scoreService } from '@/services/scoreService'
import { groupService } from '@/services/groupService'
import { SigningGrid } from '@/components/scorecard/SigningGrid'
import { Spinner, Alert, Button } from '@/components/ui'

export function SigningPage() {
  const { roundId, groupId } = useParams<{ roundId: string; groupId: string }>()
  const { currentUser } = useAuth()
  const { ctx, loading } = useScore(roundId!, groupId!)
  const [signing, setSigning] = useState<string | null>(null)
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
  const signedCount = scores.filter((s) => s.isLocked).length
  const allSigned = signedCount === group.golferIds.length

  async function handleSign(targetUid: string) {
    if (targetUid !== uid) return
    setSigning(targetUid)
    setError('')
    try {
      await scoreService.signScore(roundId!, groupId!, targetUid, uid)
      await groupService.checkAndCompleteGroup(roundId!, groupId!)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSigning(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h1 className="text-xl font-bold text-white">Sign Scorecard</h1>
        <p className="text-gray-400 text-sm mt-0.5">{round.courseName} · {round.teeName}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(signedCount / group.golferIds.length) * 100}%` }}
            />
          </div>
          <span className="text-sm text-gray-400">{signedCount}/{group.golferIds.length}</span>
        </div>
      </div>

      {error && <Alert message={error} />}

      {allSigned ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="text-5xl">✓</div>
          <p className="text-xl font-bold text-green-400">All Signed!</p>
          <p className="text-gray-400 text-sm">Scores are locked.</p>
          <Button onClick={() => navigate(`/rounds/${roundId}/summary`)}>
            View Summary
          </Button>
        </div>
      ) : (
        <>
          <SigningGrid
            scores={scores}
            holes={tee.holes}
            currentUserId={uid}
            roundId={roundId!}
            groupId={groupId!}
            onSign={handleSign}
            signing={signing}
            isNet={round.roundType.includes('NET')}
          />
          <p className="text-xs text-gray-500 text-center px-2">
            Round chat is automatically deleted 7 days after the round ends.
          </p>
        </>
      )}
    </div>
  )
}
