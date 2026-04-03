import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import type { UserProfile } from '@/types'
import { UserRow } from '@/components/admin/UserRow'
import { Card, Spinner } from '@/components/ui'

export function AdminPage() {
  const { currentUser } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    userService.listAllUsers().then((u) => { setUsers(u); setLoading(false) })
  }, [])

  async function handleToggleAdmin(uid: string, isAdmin: boolean) {
    if (uid === currentUser?.uid) return
    await userService.setAdmin(uid, isAdmin)
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, isAdmin } : u))
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white">Users</h2>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <Card>
          {users.map((user) => (
            <UserRow
              key={user.uid}
              user={user}
              isSelf={user.uid === currentUser?.uid}
              onToggleAdmin={(isAdmin) => handleToggleAdmin(user.uid, isAdmin)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}
