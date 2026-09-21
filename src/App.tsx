import * as React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { isFirebaseConfigured } from '@/firebaseConfig'
import { useAuthListener } from '@/hooks/useAuthListener'
import { useFirestoreStatus, useOfflineSync } from '@/hooks/useWiring'
import { initConnectivityListeners } from '@/stores/connectivityStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/require-auth'
import { SetupPage } from '@/pages/SetupPage'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { AssetDetailPage } from '@/pages/AssetDetailPage'
import { WorkOrdersPage } from '@/pages/WorkOrdersPage'
import { MonitoringPage } from '@/pages/MonitoringPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { SchedulesPage } from '@/pages/SchedulesPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  useAuthListener()
  useFirestoreStatus()
  useOfflineSync()

  React.useEffect(() => initConnectivityListeners(), [])

  // Pre-configuration guard: render the setup wizard without touching the
  // Firebase SDK beyond what is needed to render the page.
  if (!isFirebaseConfigured()) {
    return <SetupPage />
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="assets/:id" element={<AssetDetailPage />} />
          <Route path="workorders" element={<WorkOrdersPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}