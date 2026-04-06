import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { notificationService } from '@/services/notificationService'
import type { Notification } from '@/types'

export function TopNav() {
  const { currentUser, userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount } = useNotifications(currentUser?.uid ?? '')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setOpen(false)
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = userProfile?.displayName
    ? userProfile.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : '?'

  function handleNotifClick(n: Notification) {
    void notificationService.markRead(currentUser!.uid, n.notificationId)
    setNotifOpen(false)
    if (n.sideBetId) {
      navigate(`/rounds/${n.roundId}/side-bets/${n.sideBetId}`)
    } else {
      navigate(`/rounds/${n.roundId}`)
    }
  }

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/images/Icon.svg" alt="TeeSheet" className="h-8 w-auto" />
        </Link>

        {currentUser ? (
          <div className="flex items-center gap-2">
            {/* Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setOpen(false) }}
                className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {notifOpen && (
                <div className="fixed top-14 left-0 right-0 z-50 px-4 max-w-lg mx-auto">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl flex flex-col max-h-96 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 shrink-0">
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      <button
                        onClick={() => void notificationService.markAllRead(currentUser.uid, notifications)}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">No notifications</p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.notificationId}
                            type="button"
                            onClick={() => handleNotifClick(n)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-700 last:border-0 hover:bg-gray-700 transition-colors ${
                              n.read ? 'opacity-60' : ''
                            }`}
                        >
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => { setOpen(!open); setNotifOpen(false) }}
                className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm hover:bg-green-700 transition-colors"
              >
                {initials}
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-sm font-semibold text-white">{userProfile?.displayName}</p>
                    <p className="text-xs text-gray-400">{currentUser.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/my-scores"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    My Scores
                  </Link>
                  <Link
                    to="/my-rounds"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    My Rounds
                  </Link>
                  <Link
                    to="/my-events"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    My Events
                  </Link>
                  <Link
                    to="/my-bets"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    My Bets
                  </Link>
                  {userProfile?.isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Admin
                    </Link>
                  )}
                  <div className="border-t border-gray-700 mt-1">
                    <button
                      onClick={() => { signOut(); setOpen(false) }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white">
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
