import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2 } from 'lucide-react'

interface ToastItem {
  id: string
  message: string
}

export function Toaster({ toasts }: { toasts: ToastItem[] }) {
  if (typeof document === 'undefined' || toasts.length === 0) return null
  return createPortal(
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in flex items-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium shadow-lg text-foreground"
        >
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          {t.message}
        </div>
      ))}
    </div>,
    document.body,
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }, [])

  return { toast, toasts }
}
