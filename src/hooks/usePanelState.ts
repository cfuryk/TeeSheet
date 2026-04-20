import { useState, useCallback } from 'react'

const PREFIX = 'panel:'

export function usePanelState(key: string, defaultOpen = true): [boolean, () => void] {
  const storageKey = PREFIX + key

  const [open, setOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored === null ? defaultOpen : stored === 'true'
    } catch {
      return defaultOpen
    }
  })

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      try { localStorage.setItem(storageKey, String(next)) } catch { /* ignore */ }
      return next
    })
  }, [storageKey])

  return [open, toggle]
}
