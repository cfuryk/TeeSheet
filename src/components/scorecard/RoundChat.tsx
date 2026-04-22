import { useState, useEffect, useRef } from 'react'
import { roundChatService } from '@/services/roundChatService'
import type { RoundMessage } from '@/types'

interface Props {
  roundId: string
  uid: string
  displayName: string
  className?: string
}

function formatTime(msg: RoundMessage): string {
  if (!msg.createdAt) return ''
  const date = msg.createdAt.toDate()
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function RoundChat({ roundId, uid, displayName, className = '' }: Props) {
  const [messages, setMessages] = useState<RoundMessage[]>([])
  const [open, setOpen] = useState(true)
  const [input, setInput] = useState('')
  const [unread, setUnread] = useState(0)
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  useEffect(() => {
    return roundChatService.onMessagesSnapshot(roundId, (msgs) => {
      setMessages(msgs)
    })
  }, [roundId])

  // Track unread when collapsed
  useEffect(() => {
    if (open) {
      setUnread(0)
      prevCountRef.current = messages.length
    } else {
      const newCount = messages.length - prevCountRef.current
      if (newCount > 0) setUnread((u) => u + newCount)
      prevCountRef.current = messages.length
    }
  }, [messages, open])

  // Auto-scroll to bottom when open and messages change
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open])

  // Scroll to bottom immediately when opening
  function handleOpen() {
    setOpen(true)
    setUnread(0)
    prevCountRef.current = messages.length
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    }, 0)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      await roundChatService.sendMessage(roundId, uid, displayName, text)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`bg-brand border border-brand rounded-xl overflow-hidden flex flex-col ${className}`}>
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => open ? setOpen(false) : handleOpen()}
        className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Trash Talk</span>
          <span className="bg-danger text-white text-xs rounded-full px-1.5 py-0.5 font-semibold leading-none">
            {unread > 0 ? unread : messages.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Message list */}
          <div
            ref={listRef}
            className="px-3 py-3 flex flex-col gap-3 overflow-y-auto flex-1 min-h-32 border-t border-white/20"
          >
            {messages.length === 0 ? (
              <p className="text-xs text-white/60 text-center py-2">No messages yet. Say something!</p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.uid === uid
                if (msg.isAlert) {
                  const alertStyles = {
                    positive: 'bg-green-500/20 text-green-200 border-green-500/30',
                    negative: 'bg-red-500/20 text-red-200 border-red-500/30',
                    leader: 'bg-amber-400/20 text-amber-200 border-amber-400/30',
                    correction: 'bg-red-500/20 text-red-200 border-red-500/30',
                  }
                  const style = alertStyles[msg.alertType ?? 'leader']
                  return (
                    <div key={msg.messageId} className="flex flex-col items-center">
                      <p className="text-xs text-white/50 mb-0.5">{msg.displayName} · {formatTime(msg)}</p>
                      <div className={`px-3 py-2 text-sm text-center max-w-[90%] break-words rounded-xl border ${style}`}>
                        {msg.text}
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={msg.messageId} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <p className="text-xs text-white/60 mb-0.5 px-1">
                      {isOwn ? 'You' : msg.displayName} · {formatTime(msg)}
                    </p>
                    <div className={`px-3 py-2 text-sm max-w-[75%] break-words ${
                      isOwn
                        ? 'bg-white text-brand rounded-xl rounded-br-sm'
                        : 'bg-white/20 text-white rounded-xl rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Input row */}
          <div className="border-t border-white/20 px-3 py-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:ring-1 focus:ring-white"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="bg-danger hover:bg-danger/90 disabled:opacity-40 text-white rounded-lg px-3 h-9 text-sm transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
