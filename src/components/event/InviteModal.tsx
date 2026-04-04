import { useState, useEffect } from 'react'
import { Button, Spinner } from '@/components/ui'
import { inviteService } from '@/services/inviteService'
import type { InviteTargetType } from '@/types'

interface Props {
  targetType: InviteTargetType
  targetId: string
  createdBy: string
  onClose: () => void
}

export function InviteModal({ targetType, targetId, createdBy, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    inviteService.createInvite(targetType, targetId, createdBy).then((token) => {
      setUrl(`${window.location.origin}/invite/${token}`)
      setLoading(false)
    })
  }, [targetType, targetId, createdBy])

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-base font-semibold text-white">Invite to Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                Share this link to invite someone to join the event.
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
        </div>
      </div>
    </div>
  )
}
