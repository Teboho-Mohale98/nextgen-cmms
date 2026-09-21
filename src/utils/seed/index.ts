/**
 * Server-side demo data injector.
 *
 *   npm run seed
 *
 * Requires a Firebase service account:
 *   - set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   - or FIREBASE_SERVICE_ACCOUNT=/path/to/service-account.json
 *   - project id is read from .env (VITE_FIREBASE_PROJECT_ID) or
 *     FIREBASE_PROJECT_ID
 *
 * The in-app Settings > "Load demo data" button does the same thing with
 * the logged-in user's credentials (no service account needed).
 */
import admin from 'firebase-admin'
import fs from 'node:fs'
import path from 'node:path'
import { buildSeedPayload } from './seedPayload'

function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

async function main(): Promise<void> {
  loadDotEnv()

  const credentialPath =
    process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credentialPath) {
    console.error(
      [
        'No service account found for seeding.',
        'Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT to a JSON key path.',
        'Alternatively use the in-app injector (Settings -> Load demo data).',
      ].join('\n'),
    )
    process.exit(1)
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
  if (!projectId) {
    console.error('Missing project id. Set VITE_FIREBASE_PROJECT_ID in .env or FIREBASE_PROJECT_ID.')
    process.exit(1)
  }

  admin.initializeApp({
    projectId,
    credential: admin.credential.cert(credentialPath as string),
  })

  const firestore = admin.firestore()
  const payload = buildSeedPayload()

  const batches: typeof payload.documents[] = []
  for (let i = 0; i < payload.documents.length; i += 400) {
    batches.push(payload.documents.slice(i, i + 400))
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = firestore.batch()
    for (const docDesc of batches[b]) {
      batch.set(firestore.collection(docDesc.collection).doc(docDesc.id), docDesc.data)
    }
    await batch.commit()
    console.log(`Batch ${b + 1}/${batches.length} committed.`)
  }

  console.log(
    `\nDone: ${payload.documents.length} documents seeded across ` +
      'assets, workorders, inventoryParts, maintenanceSchedules, monitoring.',
  )
}

main().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})