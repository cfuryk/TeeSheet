import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui'

const workspaces = [
  { label: 'Users', description: 'Manage user accounts and admin permissions', path: '/admin/users' },
  { label: 'Rounds', description: 'View and manage all active and pending rounds', path: '/admin/rounds' },
  { label: 'Events', description: 'View and manage all events', path: '/admin/events' },
  { label: 'Scores', description: 'Search, view, and edit all golfer scores', path: '/admin/scores' },
]

export function AdminPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Admin</h1>
      <div className="grid grid-cols-2 gap-3">
        {workspaces.map((w) => (
          <button key={w.path} onClick={() => navigate(w.path)} className="text-left">
            <Card className="p-4 hover:border-gray-500 transition-colors h-full">
              <p className="font-semibold text-white mb-1">{w.label}</p>
              <p className="text-xs text-gray-400">{w.description}</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
