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
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 last:border-0">
        <div>
          <p className="font-medium text-white">
            {user.displayName} {isSelf && <span className="text-xs text-gray-400">(you)</span>}
          </p>
          <p className="text-xs text-gray-500">{user.email}</p>
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
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-sm w-full flex flex-col gap-4">
            <p className="text-white font-semibold">Cannot remove your own admin</p>
            <p className="text-sm text-gray-400">You cannot remove admin permissions from your own account. Ask another admin to do this.</p>
            <Button onClick={() => setShowSelfWarning(false)}>OK</Button>
          </div>
        </div>
      )}
    </>
  )
}
