import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui'

const workspaces = [
  { label: 'Users', description: 'Manage user accounts and admin permissions', path: '/admin/users' },
  { label: 'Rounds', description: 'View and manage all active and pending rounds', path: '/admin/rounds' },
  { label: 'Events', description: 'View and manage all events', path: '/admin/events' },
  { label: 'Scores', description: 'Search, view, and edit all golfer scores', path: '/admin/scores' },
  { label: 'Bets', description: 'View and monitor all side bets across all rounds', path: '/admin/bets' },
]

export function AdminPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-brand">Admin</h1>
      <div className="grid grid-cols-2 gap-3">
        {workspaces.map((w) => (
          <button key={w.path} onClick={() => navigate(w.path)} className="text-left">
            <Card className="p-4 hover:border-brand/50 transition-colors h-full">
              <p className="font-semibold text-brand mb-1">{w.label}</p>
              <p className="text-xs text-muted">{w.description}</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
