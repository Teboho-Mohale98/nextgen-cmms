import * as React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string | null
  src?: string | null
  className?: string
}

function initialsOf(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, src, className }: AvatarProps) {
  const [failed, setFailed] = React.useState(false)
  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary',
        className,
      )}
      aria-label={name ?? 'user'}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name ?? ''}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initialsOf(name)
      )}
    </div>
  )
}