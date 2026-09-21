import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

const ICONS = {
  success: CheckCircle2,
  default: Info,
  warning: AlertTriangle,
  destructive: XCircle,
}

const TONES = {
  success: 'text-success',
  default: 'text-info',
  warning: 'text-warning',
  destructive: 'text-destructive',
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant]
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border bg-popover p-3.5 shadow-lg animate-slide-in-top"
            role="status"
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', TONES[toast.variant])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}