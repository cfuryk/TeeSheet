import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Spinner } from '@/components/ui'
import { inviteService } from '@/services/inviteService'
import type { InviteTargetType } from '@/types'

interface Props {
  targetType: InviteTargetType
  targetId: string
  createdBy: string
  targetName?: string
  onClose: () => void
}

export function InviteModal({ targetType, targetId, createdBy, targetName, onClose }: Props) {
  const navigate = useNavigate()
  const [view, setView] = useState<'options' | 'link'>('options')
  const [url, setUrl] = useState<string | null>(null)
  const [loadingLink, setLoadingLink] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (view !== 'link' || url) return
    setLoadingLink(true)
    inviteService.createInvite(targetType, targetId, createdBy).then((token) => {
      setUrl(`${window.location.origin}/invite/${token}`)
      setLoadingLink(false)
    })
  }, [view, url, targetType, targetId, createdBy])

  async function handleShare() {
    if (!url) return
    await navigator.share({ title: 'Join me on TeeSheet', url })
  }

  async function handleCopy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const title = targetType === 'event' ? 'Invite to Event' : 'Invite to Round'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            {view === 'link' && (
              <button
                type="button"
                onClick={() => setView('options')}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                ← Back
              </button>
            )}
            <h2 className="text-base font-semibold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {view === 'options' && (
            <>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/invite-golfers?targetType=${targetType}&targetId=${targetId}&roundName=${encodeURIComponent(targetName ?? '')}`,
                  )
                }
                className="w-full flex items-center gap-3 px-4 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-left"
              >
                <span className="text-2xl">👥</span>
                <div>
                  <p className="text-sm font-semibold text-white">Search &amp; Add Golfers</p>
                  <p className="text-xs text-gray-400 mt-0.5">Find and add existing app users directly</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setView('link')}
                className="w-full flex items-center gap-3 px-4 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-left"
              >
                <span className="text-2xl">🔗</span>
                <div>
                  <p className="text-sm font-semibold text-white">Share Invite Link</p>
                  <p className="text-xs text-gray-400 mt-0.5">Anyone with the link can join</p>
                </div>
              </button>
            </>
          )}

          {view === 'link' && (
            <>
              {loadingLink ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400">
                    Share this link to invite someone to join.
                  </p>
                  <div className="bg-gray-700 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-300 break-all select-all">{url}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {typeof navigator.share === 'function' && (
                      <Button onClick={handleShare} className="w-full">
                        Share via…
                      </Button>
                    )}
                    <Button variant="secondary" onClick={handleCopy} className="w-full">
                      {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
