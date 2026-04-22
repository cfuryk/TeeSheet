import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isInStandaloneMode = () => ('standalone' in navigator) && (navigator as any).standalone

function IosInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg p-6 pb-10 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-brand">Install on iPhone</p>
          <button onClick={onClose} className="text-muted text-xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-muted">Add this app to your home screen for the best experience:</p>
        <ol className="flex flex-col gap-3">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span className="text-sm text-brand">Open this page in <strong>Safari</strong> (not Chrome or Firefox)</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span className="text-sm text-brand">Tap the <strong>Share</strong> button <span className="inline-block">⎋</span> at the bottom of the screen</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span className="text-sm text-brand">Scroll down and tap <strong>"Add to Home Screen"</strong></span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            <span className="text-sm text-brand">Tap <strong>"Add"</strong> in the top right</span>
          </li>
        </ol>
        <button
          onClick={onClose}
          className="mt-2 h-9 w-full rounded-xl bg-brand text-white text-sm font-semibold"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

export function TopNav() {
  const { currentUser, userProfile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [showIosModal, setShowIosModal] = useState(false)

  const showIosInstall = isIos() && !isInStandaloneMode()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', () => setInstallPrompt(null))
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (installPrompt as any).prompt()
    setInstallPrompt(null)
    setOpen(false)
  }

  const initials = userProfile?.displayName
    ? userProfile.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : '?'

  return (
    <>
    <header className="bg-brand sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/images/events/USBROPEN.svg" alt="USBROPEN" className="h-8 w-auto" />
        </Link>

        {currentUser ? (
          <div className="flex items-center gap-2">
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
                    <p className="text-xs text-muted">v{__APP_VERSION__}</p>
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
                  {installPrompt && (
                    <button
                      onClick={handleInstall}
                      className="block w-full text-left px-4 py-2 text-sm text-brand hover:bg-card-bg"
                    >
                      Install App
                    </button>
                  )}
                  {showIosInstall && (
                    <button
                      onClick={() => { setShowIosModal(true); setOpen(false) }}
                      className="block w-full text-left px-4 py-2 text-sm text-brand hover:bg-card-bg"
                    >
                      Install App
                    </button>
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
              className="inline-flex items-center text-sm bg-white/20 hover:bg-white/30 text-white px-3 h-8 rounded-lg font-semibold transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
      {showIosModal && <IosInstallModal onClose={() => setShowIosModal(false)} />}
    </>
  )
}
