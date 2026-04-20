import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import type { UserProfile } from '@/types'
import { UserRow } from '@/components/admin/UserRow'
import { Card, Spinner, Button } from '@/components/ui'

export function AdminUsersPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brand">Admin Users</h2>
        <Button variant="primary" size="sm" onClick={() => navigate('/admin')}>Back</Button>
      </div>
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
