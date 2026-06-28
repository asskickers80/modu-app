import { useState, useCallback } from 'react'

export function useToast(duration = 1800) {
  const [toast, setToast] = useState('')
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), duration)
  }, [duration])
  return { toast, showToast }
}
