import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState('')
  const showToast = useCallback((msg = '준비 중이에요 🚧') => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }, [])
  return { toast, showToast }
}
