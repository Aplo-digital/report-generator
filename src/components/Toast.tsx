import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2 } from 'lucide-react'

interface ToastItem {
  id: string
  message: string
  exiting?: boolean
}

function ToastWrapper({ exiting, children }: { exiting?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [lockedHeight, setLockedHeight] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (exiting && ref.current && lockedHeight === null) {
      setLockedHeight(ref.current.offsetHeight)
      requestAnimationFrame(() => requestAnimationFrame(() => setCollapsed(true)))
    }
  }, [exiting, lockedHeight])

  return (
    <div
      ref={ref}
      style={{
        height: collapsed ? 0 : lockedHeight ?? undefined,
        overflow: collapsed ? 'hidden' : 'visible',
        transition: collapsed ? 'height 280ms ease' : 'none',
      }}
    >
      {children}
    </div>
  )
}

export function Toaster({ toasts }: { toasts: ToastItem[] }) {
  if (typeof document === 'undefined' || toasts.length === 0) return null
  return createPortal(
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center pointer-events-none">
      {toasts.map((t) => (
        <ToastWrapper key={t.id} exiting={t.exiting}>
          <div className="px-2 pt-1 pb-3">
            <div className={`${t.exiting ? 'toast-out' : 'toast-in'} flex items-center gap-3 rounded-2xl text-white bg-slate-900 px-4 py-3 text-sm font-medium shadow-xl whitespace-nowrap min-w-md`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              {t.message}
            </div>
          </div>
        </ToastWrapper>
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
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t))
    }, 2720)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return { toast, toasts }
}
