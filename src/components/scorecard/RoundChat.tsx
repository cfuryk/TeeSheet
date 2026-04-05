import { useState, useEffect, useRef } from 'react'
import { roundChatService } from '@/services/roundChatService'
import type { RoundMessage } from '@/types'

interface Props {
  roundId: string
  uid: string
  displayName: string
}

function formatTime(msg: RoundMessage): string {
  if (!msg.createdAt) return ''
  const date = msg.createdAt.toDate()
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function RoundChat({ roundId, uid, displayName }: Props) {
  const [messages, setMessages] = useState<RoundMessage[]>([])
  const [open, setOpen] = useState(false)
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
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => open ? setOpen(false) : handleOpen()}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Chat</span>
          {!open && unread > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 font-semibold leading-none">
              {unread}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Message list */}
          <div
            ref={listRef}
            className="px-3 py-3 flex flex-col gap-3 overflow-y-auto max-h-48 border-t border-gray-700"
          >
            {messages.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No messages yet. Say something!</p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.uid === uid
                return (
                  <div key={msg.messageId} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <p className="text-xs text-gray-500 mb-0.5 px-1">
                      {isOwn ? 'You' : msg.displayName} · {formatTime(msg)}
                    </p>
                    <div className={`px-3 py-2 text-sm max-w-[75%] break-words ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-xl rounded-br-sm'
                        : 'bg-gray-700 text-gray-200 rounded-xl rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Input row */}
          <div className="border-t border-gray-700 px-3 py-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
