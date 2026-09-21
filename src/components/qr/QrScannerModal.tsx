import * as React from 'react'
import { ScanLine, AlertCircle } from 'lucide-react'
import QrScanner from 'qr-scanner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface QrScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetect: (text: string) => void
}

/**
 * Camera QR scanner used by field technicians. Decodes QR codes and calls
 * onDetect with the raw value - callers match against asset.qrCode.
 * Requires a secure context (HTTPS or localhost).
 */
export function QrScannerModal({ open, onOpenChange, onDetect }: QrScannerModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [active, setActive] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setActive(false)
      setError(null)
      return
    }

    const el = videoRef.current
    if (!el || !('mediaDevices' in navigator)) {
      setError('This browser does not support camera access.')
      return
    }

    let scanner: QrScanner | null = null
    let cancelled = false

    const start = async () => {
      try {
        scanner = new QrScanner(
          el,
          (result) => {
            scanner?.stop()
            onOpenChange(false)
            onDetect(result.data)
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            onDecodeError: () => undefined,
          },
        )
        await scanner.start()
        if (!cancelled) setActive(true)
      } catch (err) {
        console.warn('[cmms] camera error', err)
        if (!cancelled) setError('Unable to access the camera. Check permissions.')
      }
    }

    void start()

    return () => {
      cancelled = true
      scanner?.stop()
      scanner?.destroy()
      scanner = null
    }
  }, [open, onDetect, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-4 text-primary" />
            Scan asset QR code
          </DialogTitle>
          <DialogDescription>
            Point the camera at an asset tag. The matching asset opens instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto mt-1 aspect-square w-full max-w-sm overflow-hidden rounded-lg border bg-black">
          <video
            ref={videoRef}
            className="size-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
            muted
            playsInline
          />
          {active && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-40 rounded-xl border-2 border-white/80 shadow-[0_0_0_3px_rgba(0,0,0,0.4),0_0_0_700px_rgba(0,0,0,0.35)]" />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}