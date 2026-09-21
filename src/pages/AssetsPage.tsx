import { useNavigate } from 'react-router-dom'
import { Network, Plus, ScanLine, Database } from 'lucide-react'
import { useAssets, findAssetByQr } from '@/hooks/useAssets'
import { AssetTree } from '@/features/assets/AssetTree'
import { AssetFormDialog } from '@/features/assets/AssetFormDialog'
import { QrScannerModal } from '@/components/qr/QrScannerModal'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { notify } from '@/stores/toastStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDialog } from '@/hooks/useDialog'

export function AssetsPage() {
  const assets = useAssets()
  const navigate = useNavigate()
  const form = useDialog()
  const scanner = useDialog()

  const handleScan = (qr: string) => {
    const asset = findAssetByQr(assets, qr)
    if (asset) {
      notify.success('Asset found', asset.name)
      navigate(`/assets/${asset.id}`)
    } else {
      notify.error('Asset not found', `No asset matches QR code "${qr}".`)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Smart Asset Hierarchy</h2>
          <p className="text-sm text-muted-foreground">
            Navigate nested parent-child assets with live health meters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => scanner.open()}>
            <ScanLine /> Scan QR
          </Button>
          <Button onClick={form.open}>
            <Plus /> Add asset
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Network className="size-4 text-primary" />
            Plant structure · {assets.length} assets
          </CardTitle>
          <CardDescription>
            Green = operational · amber = degraded · red = down. Health is computed from live telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No assets registered"
              description="Load the demo dataset from Settings, or register your first asset now."
              action={
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={form.open}>
                    <Plus /> Register asset
                  </Button>
                </div>
              }
            />
          ) : (
            <AssetTree />
          )}
        </CardContent>
      </Card>

      <AssetFormDialog open={form.isOpen} onOpenChange={form.set} assets={assets} />
      <QrScannerModal
        open={scanner.isOpen}
        onOpenChange={scanner.set}
        onDetect={handleScan}
      />
    </div>
  )
}