"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ConfirmOptions = {
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  /** Return true to close the dialog, false to leave it open (e.g. on error). */
  onConfirm: () => Promise<boolean>
}

type ConfirmFn = (options: ConfirmOptions) => void

const ConfirmContext = React.createContext<ConfirmFn | null>(null)

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null)
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const confirm = React.useCallback<ConfirmFn>((next) => {
    setOptions(next)
    setOpen(true)
  }, [])

  function handleConfirm() {
    if (!options) return
    startTransition(async () => {
      const shouldClose = await options.onConfirm()
      if (shouldClose) setOpen(false)
    })
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{options?.title}</DialogTitle>
            {options?.description ? (
              <DialogDescription>{options.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="ghost" disabled={pending}>
                  {options?.cancelLabel ?? "Cancel"}
                </Button>
              }
            />
            <Button
              variant={options?.variant === "destructive" ? "destructive" : "default"}
              disabled={pending}
              onClick={handleConfirm}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {options?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const confirm = React.useContext(ConfirmContext)
  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider")
  }
  return confirm
}
