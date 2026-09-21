import * as React from 'react'
import { useSyncExternalStore } from 'react'
import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore'

/**
 * Lightweight realtime layer on Firestore `onSnapshot`, shared across the
 * SPA. Multiple components subscribing with the same key share one socket.
 *
 * CONTRACT: `key` MUST be unique per query shape (filters/order/sort).
 * Never mutate the returned arrays - treat them as immutable snapshots.
 */

interface LiveEntry<T> {
  data: T[] | null
  listeners: Set<() => void>
  unsub: (() => void) | null
}

const entries = new Map<string, LiveEntry<never>>()

function getEntry<T>(key: string): LiveEntry<T> {
  let entry = entries.get(key) as LiveEntry<T> | undefined
  if (!entry) {
    entry = { data: null, listeners: new Set(), unsub: null }
    entries.set(key, entry as LiveEntry<never>)
  }
  return entry
}

function subscribeQuery<T extends object>(key: string, query: Query, onChange: () => void): () => void {
  const entry = getEntry<T>(key)
  entry.listeners.add(onChange)
  if (!entry.unsub) {
    entry.unsub = onSnapshot(
      query,
      (snap) => {
        entry.data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
        entry.listeners.forEach((l) => l())
      },
      (err) => {
        console.error(`[cmms] live collection "${key}" error`, err)
        entry.data = entry.data ?? []
        entry.listeners.forEach((l) => l())
      },
    )
  }
  return () => {
    entry.listeners.delete(onChange)
    if (entry.listeners.size === 0 && entry.unsub) {
      entry.unsub()
      entry.unsub = null
      entry.data = null
    }
  }
}

export function useCollectionLive<T extends object>(key: string, query: () => Query): T[] {
  const entry = getEntry<T>(key)
  const getSnapshot = React.useCallback(() => (entry.data as T[]) ?? (EMPTY as T[]), [entry])
  return useSyncExternalStore(
    (onChange) => subscribeQuery<T>(key, query(), onChange),
    getSnapshot,
    getSnapshot,
  )
}

const EMPTY: unknown[] = []

/* ------------------------------------------------------------------ */

interface LiveDocEntry<T> {
  data: T | undefined
  listeners: Set<() => void>
  unsub: (() => void) | null
}

const docEntries = new Map<string, LiveDocEntry<never>>()

function getDocEntry<T>(key: string): LiveDocEntry<T> {
  let entry = docEntries.get(key) as LiveDocEntry<T> | undefined
  if (!entry) {
    entry = { data: undefined, listeners: new Set(), unsub: null }
    docEntries.set(key, entry as LiveDocEntry<never>)
  }
  return entry
}

function subscribeDoc<T extends object>(key: string, ref: DocumentReference, onChange: () => void): () => void {
  const entry = getDocEntry<T>(key)
  entry.listeners.add(onChange)
  if (!entry.unsub) {
    entry.unsub = onSnapshot(
      ref,
      (snap) => {
        entry.data = snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : undefined
        entry.listeners.forEach((l) => l())
      },
      (err) => {
        console.error(`[cmms] live document "${key}" error`, err)
        entry.listeners.forEach((l) => l())
      },
    )
  }
  return () => {
    entry.listeners.delete(onChange)
    if (entry.listeners.size === 0 && entry.unsub) {
      entry.unsub()
      entry.unsub = null
      entry.data = undefined
    }
  }
}

export function useDocumentLive<T extends object>(key: string, ref: () => DocumentReference): T | undefined {
  const entry = getDocEntry<T>(key)
  const getSnapshot = React.useCallback(() => entry.data, [entry])
  return useSyncExternalStore(
    (onChange) => subscribeDoc<T>(key, ref(), onChange),
    getSnapshot,
    getSnapshot,
  )
}