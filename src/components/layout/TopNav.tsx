import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function TopNav() {
  const { currentUser, userProfile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = userProfile?.displayName
    ? userProfile.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : '?'

  return (
    <header className="bg-brand sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/images/events/USBROPEN.svg" alt="USBROPEN" className="h-8 w-auto" />
        </Link>

        {currentUser ? (
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen(!open)}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm hover:bg-white/30 transition-colors"
              >
                {initials}
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-card-border rounded-xl shadow-xl py-1 z-50">
                  <div className="px-4 py-2 border-b border-card-border">
                    <p className="text-sm font-semibold text-brand">{userProfile?.displayName}</p>
                    <p className="text-xs text-muted">{currentUser.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-brand hover:bg-card-bg"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/my-scores"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-brand hover:bg-card-bg"
                  >
                    My Scores
                  </Link>
                  {userProfile?.isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 text-sm text-brand hover:bg-card-bg"
                    >
                      Admin
                    </Link>
                  )}
                  <div className="border-t border-card-border mt-1">
                    <button
                      onClick={() => { signOut(); setOpen(false) }}
                      className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-card-bg"
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
            <Link to="/login" className="text-sm text-white/70 hover:text-white">
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
