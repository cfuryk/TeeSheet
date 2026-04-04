import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { inviteService } from '@/services/inviteService'
import { Spinner, Alert } from '@/components/ui'
import type { Invite } from '@/types'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { currentUser, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [invite, setInvite] = useState<Invite | null | undefined>(undefined) // undefined = loading
  const [fulfilling, setFulfilling] = useState(false)
  const [error, setError] = useState('')

  // Load invite on mount
  useEffect(() => {
    inviteService.getInvite(token!).then(setInvite)
  }, [token])

  // Auto-fulfill when user is logged in and invite is loaded
  useEffect(() => {
    if (!currentUser || invite === undefined || invite === null) return
    setFulfilling(true)
    inviteService
      .fulfillInvite(token!, currentUser.uid)
      .then((result) => {
        if (result) {
          const path = result.targetType === 'event'
            ? `/events/${result.targetId}`
            : `/rounds/${result.targetId}`
          navigate(path, { replace: true })
        }
      })
      .catch(() => setError('Failed to join. Please try again.'))
      .finally(() => setFulfilling(false))
  }, [currentUser, invite, token, navigate])

  const isLoading = authLoading || invite === undefined || fulfilling

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (invite === null) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-white font-semibold">Invalid invite link.</p>
        <p className="text-sm text-gray-400">This link may have expired or doesn't exist.</p>
        <Link to="/" className="text-green-400 text-sm hover:text-green-300">Go to TeeSheet</Link>
      </div>
    )
  }

  // Valid invite, user not logged in
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 px-4">
      {error && <Alert message={error} />}
      <div className="text-center">
        <h1 className="text-2xl font-black text-white mb-2">You're Invited!</h1>
        <p className="text-gray-400 text-sm">Sign in or create a free account to join.</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/login"
          state={{ inviteToken: token }}
          className="bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-semibold transition-colors"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          state={{ inviteToken: token }}
          className="bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-semibold transition-colors"
        >
          Register Free
        </Link>
      </div>
    </div>
  )
}
