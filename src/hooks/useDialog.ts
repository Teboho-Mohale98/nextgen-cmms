import * as React from 'react'

export function useDialog(initialOpen = false) {
  const [isOpen, setOpen] = React.useState(initialOpen)
  return {
    isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen((v) => !v),
    set: setOpen,
  }
}