import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

interface QrCodeProps {
  value: string
  size?: number
  label?: string
  className?: string
  fgColor?: string
  bgColor?: string
}

export function QrCode({
  value,
  size = 128,
  label,
  className,
  fgColor = 'currentColor',
  bgColor = 'transparent',
}: QrCodeProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="rounded-lg border bg-white p-2.5 shadow-sm">
        <QRCodeSVG
          value={value}
          size={size}
          fgColor={fgColor}
          bgColor={bgColor}
          level="M"
        />
      </div>
      {label && <p className="font-mono text-[11px] text-muted-foreground">{label}</p>}
    </div>
  )
}