import { create } from 'zustand'
import { uid } from '@/lib/utils'
import type { ToastMessage } from '@/types'

interface ToastState {
  toasts: ToastMessage[]
  push: (toast: Omit<ToastMessage, 'id'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

const AUTO_DISMISS_MS = 5200

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = uid('toast')
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    if (toast.dismissible === false) return id
    window.setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS)
    return id
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  dismissAll: () => set({ toasts: [] }),
}))

/** Imperative helpers for use anywhere (services, triggers, forms). */
export const notify = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'destructive' }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'warning' }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'default' }),
}