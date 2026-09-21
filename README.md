# NextGen CMMS

A production-ready, open-source **Computerized Maintenance Management System** designed to outperform legacy platforms like Fiix. Offline-first, powered by Firebase, with a live IoT trigger engine, QR asset tagging and AI-assisted forecasting.

![stack](https://img.shields.io/badge/React-19-61dafb) ![cloud](https://img.shields.io/badge/Firebase-Firestore-FFCA28) ![state](https://img.shields.io/badge/TanStack%20Query-Zustand-0F172A) ![offline](https://img.shields.io/badge/Offline--First-IndexedDB-success)

---

## Highlights (how this beats legacy CMMS)

| # | Capability | Where |
|---|------------|-------|
| 1 | **Smart Asset Hierarchy** – nested parent/child tree, live health meters, QR scan-to-open | `/assets` |
| 2 | **IoT Sensor Trigger Engine** – telemetry breaches spawn work orders automatically (client + server side) | `/monitoring` |
| 3 | **Offline-First Field Mode** – full offline WO creation, local queue, auto re-sync on reconnect | everywhere + header badge |
| 4 | **AI Maintenance & Parts Forecaster** – root-cause analysis + consolidated purchase requisitions | `/settings` + Cloud Functions |

## Tech stack

- **Frontend** – React 19, TypeScript, Vite, Tailwind CSS 4, Lucide icons, shadcn-style UI primitives
- **State** – Zustand (global UI/auth/connectivity/offline queue) + TanStack Query (mutations & aggregates)
- **Realtime** – Firestore `onSnapshot` over a shared live-store (`src/hooks/useFirestoreLive.ts`)
- **Offline** – Firestore IndexedDB persisted cache (multi-tab) + local work-order queue reconciled by id on reconnect
- **Backend** – Firebase Auth, Firestore, Storage, Cloud Functions (Node 22)
- **QR** – render with `qrcode.react`, scan with `qr-scanner` (camera, secure context)

## Project structure

```
nextgen-cmms/
├─ firestore.rules            # RBAC rules (admin / manager / technician / viewer)
├─ storage.rules
├─ functions/                 # Cloud Functions backend
│  └─ src/
│     ├─ auth.ts              # setUserRole (admin-only callable, custom claims)
│     ├─ ai.ts                # aiAnalyze (OpenAI / Gemini / rule fallback)
│     ├─ iot.ts               # sensor-reading trigger engine (server-side)
│     └─ schedules.ts         # daily calendar/meter scheduler
└─ src/
   ├─ firebaseConfig.ts       # Firebase init + offline persistence
   ├─ types/index.ts          # Firestore schema models (Assets, WOs, Parts, Schedules…)
   ├─ config/roles.ts         # role hierarchy + UI guards
   ├─ stores/                 # auth, connectivity, toasts, offline queue, theme
   ├─ services/               # Firestore data access (assets, WO, parts, sensors…)
   ├─ hooks/                  # realtime hooks, media query, auth listener, sync
   ├─ components/             # ui primitives, layout (sidebar/header), QR
   ├─ features/               # assets, workorders, monitoring, inventory, schedules
   ├─ pages/                  # dashboard + 7 routed screens
   └─ utils/seed/             # demo dataset injector (in-app + CLI)
```

## Getting started

### 1. Prerequisites

- Node 20+ (Node 22 recommended)
- A Firebase project with **Authentication (Email/Password)**, **Firestore**, **Storage**

### 2. Configure Firebase

```bash
npm install
cp .env.example .env            # paste your Firebase web-app config
```

Firestore must be set to **test/development mode** (or deploy the shipped rules) so the
first account can bootstrap. The **first user created is promoted to `admin`**.

### 3. Deploy rules + backend (once)

```bash
npm run deploy:rules            # firestore.rules + storage.rules
npm run deploy:functions        # roles, AI, IoT trigger, scheduler
```

> Cloud Functions require `firebase login` and a Blaze (pay-as-you-go) plan on newer projects.
> The app core (UI + offline + triggers via client engine) works without them; roles, AI and
> the server-side scheduler need them.

### 4. Run

```bash
npm run dev
```

Open `http://localhost:5173` → **Sign up** (first account = admin) → **Settings → Load demo data**.

## Demo data

Two ways to populate the app:

- **In-app (recommended):** Settings → *Demo dataset* → **Load demo data**. Uses your session.
- **CLI:** requires a service account, seeds from the server.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm run seed
```

Loads: 11 nested assets (factory hierarchy) · 8 work orders · 7 spare parts (some below reorder)
· 5 maintenance schedules · 5 live sensor monitors (breached assets included, so the trigger
engine raises work orders immediately).

## Firestore schema

Roles: `admin` · `manager` · `technician` · `viewer` (Auth custom claims + `/users/{uid}` profile).

| Collection | Model |
|---|---|
| `assets` | `{ id, name, location, parentId, status, qrCode, healthScore, thresholds, metrics }` |
| `workorders` | `{ id, assetId, title, priority, status, assignedTo, triggerType, offlineCreated, createdAt, completedAt }` |
| `inventoryParts` | `{ id, partNumber, name, quantityOnHand, minReorderPoint, cost, assignedAssets, reorderQty }` |
| `maintenanceSchedules` | `{ id, assetId, frequencyDays, meterInterval, lastExecuted, nextDue }` |
| `monitoring` | `{ assetId, name, temp, vibration, runHours, breached[], thresholds, status, readCount, enabled }` |
| `sensorReadings` | append-only telemetry log (feeds server trigger) |
| `auditLog` | auto-reorder + role + AI events |
| `users` | `{ uid, email, displayName, role, status }` |

## Offline-first behavior

- Firestore persisted cache keeps previously-seen data readable offline.
- Creating a work order while offline writes a local copy to the **offline queue** (Zustand +
  IndexedDB) and mirror-writes to Firestore; the SDK queues the write locally.
- On reconnect (browser or Firestore link restored) `flushOfflineQueue()` pushes pending drafts
  and then removes them from the queue. The header shows **Online/Offline + pending count**.
- Rule of thumb: local-first ids (`setDoc` with generated ids) make reconciliation by id trivial.

## Security model

`firestore.rules` enforces RBAC at the database level:

- `viewer` – read everything
- `technician` – create/update work orders, update asset runtime state, decrement stock
- `manager` – full read/write on operational data
- `admin` – everything incl. deletes and `auditLog`

Never store secrets in the client. API keys are restricted by Firebase (HTTP referrer), rules
enforce authorization, and custom claims are only writable via the `setUserRole` function.

## Roadmap notes

- Real device ingestion (MQTT / PLC) posting to `monitoring/{assetId}`
- Attachments & photo annotations (Storage rules already namespaced by uid)
- FCM push on breach for technicians
- Admin Console for user management without Shell role assignment

## License

MIT – build on it, open it up, and run circles around legacy CMMS.