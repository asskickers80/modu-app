import { useState, useCallback } from 'react'

export function useToast(duration = 1800) {
  const [toast, setToast] = useState('')
  const showToast = useCallback((msg = '준비 중이에요 🚧') => {
    setToast(msg)
    setTimeout(() => setToast(''), duration)
  }, [duration])
  return { toast, showToast }
}
