import { create } from 'zustand'

export type ToastType = 'error' | 'success' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: ({ type, message }) => {
    const id = Math.random().toString(36).slice(2, 9)
    set(s => ({ toasts: [...s.toasts, { id, type, message }] }))
  },
  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// Imperative API — callable from outside React (e.g. axios interceptors)
export const toast = {
  error:   (message: string) => useToastStore.getState().push({ type: 'error',   message }),
  success: (message: string) => useToastStore.getState().push({ type: 'success', message }),
  warning: (message: string) => useToastStore.getState().push({ type: 'warning', message }),
  info:    (message: string) => useToastStore.getState().push({ type: 'info',    message }),
}
