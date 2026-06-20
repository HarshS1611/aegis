import { useEffect, useState } from "react"

export type TransactionLogEntry = {
  id: string
  label: string
  status: "success" | "error" | "warning"
  message?: string
  signature?: string
  bundleId?: string
  timestamp: number
}

let entries: TransactionLogEntry[] = []
const listeners = new Set<() => void>()

export function addTransactionLogEntry(
  entry: Omit<TransactionLogEntry, "id" | "timestamp">
) {
  entries = [
    { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
    ...entries,
  ]
  listeners.forEach((listener) => listener())
}

export function useTransactionLog() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const listener = () => setVersion((v) => v + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return entries
}
