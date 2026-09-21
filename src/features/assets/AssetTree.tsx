import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronDown,
  Box,
  LayoutGrid,
  MapPin,
  QrCode,
} from 'lucide-react'
import type { Asset } from '@/types'
import { ASSET_STATUS_LABEL } from '@/types'
import { assetStatusTone } from '@/lib/status'
import { assetHealthScore } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useAssets } from '@/hooks/useAssets'

export function AssetTree() {
  const assets = useAssets()
  const ids = React.useMemo(() => new Set(assets.map((a) => a.id)), [assets])
  const roots = assets.filter((a) => !a.parentId || !ids.has(a.parentId))
  const childrenMap = React.useMemo(() => {
    const map = new Map<string | null, Asset[]>()
    for (const a of assets) {
      const list = map.get(a.parentId) ?? []
      list.push(a)
      map.set(a.parentId, list)
    }
    return map
  }, [assets])

  if (assets.length === 0) return null

  return (
    <div className="space-y-1">
      {roots.map((root) => (
        <TreeNode key={root.id} asset={root} childrenMap={childrenMap} depth={0} />
      ))}
    </div>
  )
}

function TreeNode({
  asset,
  childrenMap,
  depth,
}: {
  asset: Asset
  childrenMap: Map<string | null, Asset[]>
  depth: number
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = React.useState(depth < 1)
  const children = childrenMap.get(asset.id) ?? []
  const score = assetHealthScore(asset)
  const tone = assetStatusTone(asset.status)

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
          'bg-card/60 hover:bg-accent/40',
        )}
        style={{ marginLeft: depth * 18 }}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="-ml-1.5 shrink-0 text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
          disabled={children.length === 0}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {children.length === 0 ? (
            <Box className="size-3.5" />
          ) : expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          onClick={() => navigate(`/assets/${asset.id}`)}
        >
          {children.length > 0 ? (
            <LayoutGrid className="size-4 shrink-0 text-info" />
          ) : (
            <Box className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium">{asset.name}</span>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
            <MapPin className="size-3" />
            {asset.location}
          </span>
          <span className="hidden items-center gap-1 font-mono text-[10px] text-muted-foreground/70 lg:inline-flex">
            <QrCode className="size-3" />
            {asset.qrCode}
          </span>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="hidden w-24 flex-col gap-1 sm:flex">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Health</span>
              <span>{score}</span>
            </div>
            <Progress
              value={score}
              className="h-1.5"
              indicatorClassName={
                score >= 70
                  ? 'bg-success'
                  : score >= 40
                    ? 'bg-warning'
                    : 'bg-destructive'
              }
            />
          </div>
          <Badge variant={tone}>{ASSET_STATUS_LABEL[asset.status]}</Badge>
        </div>
      </div>

      {expanded &&
        children.map((child) => (
          <TreeNode key={child.id} asset={child} childrenMap={childrenMap} depth={depth + 1} />
        ))}
    </div>
  )
}