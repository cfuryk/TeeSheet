import { useState } from 'react'
import type { UserProfile } from '@/types'
import { Button } from '@/components/ui'

interface Props {
  user: UserProfile
  isSelf: boolean
  onToggleAdmin: (isAdmin: boolean) => void
}

export function UserRow({ user, isSelf, onToggleAdmin }: Props) {
  const [showSelfWarning, setShowSelfWarning] = useState(false)

  function handleClick() {
    if (isSelf) {
      setShowSelfWarning(true)
      return
    }
    onToggleAdmin(!user.isAdmin)
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-border last:border-0">
        <div>
          <p className="font-medium text-brand">
            {user.displayName} {isSelf && <span className="text-xs text-muted">(you)</span>}
          </p>
          <p className="text-xs text-muted">{user.email}</p>
        </div>
        <Button
          variant={user.isAdmin ? 'danger' : 'secondary'}
          size="sm"
          onClick={handleClick}
        >
          {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
        </Button>
      </div>

      {showSelfWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card-bg border border-card-border rounded-xl p-6 max-w-sm w-full flex flex-col gap-4">
            <p className="text-brand font-semibold">Cannot remove your own admin</p>
            <p className="text-sm text-muted">You cannot remove admin permissions from your own account. Ask another admin to do this.</p>
            <Button onClick={() => setShowSelfWarning(false)}>OK</Button>
          </div>
        </div>
      )}
    </>
  )
}
