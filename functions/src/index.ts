import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { setGlobalOptions } from 'firebase-functions/v2'

setGlobalOptions({ region: 'europe-west1', memory: '256MiB', timeoutSeconds: 60 })

initializeApp()

export const db = getFirestore()
export const auth = getAuth()

export * from './auth'
export * from './ai'
export * from './iot'
export * from './schedules'