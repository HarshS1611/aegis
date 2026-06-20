"use client"

import { CheckCircle2, ExternalLink, XCircle, AlertTriangle } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTransactionLog } from "@/lib/transaction-log"
import { explorerTxUrl } from "@/lib/solana/config"

const STATUS_ICON = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
}

const STATUS_CLASS = {
  success: "text-emerald-500",
  error: "text-destructive",
  warning: "text-yellow-500",
}

export function TransactionLog() {
  const entries = useTransactionLog()

  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 text-sm">
          {entries.map((entry) => {
            const Icon = STATUS_ICON[entry.status]
            return (
              <li key={entry.id} className="flex items-start gap-2">
                <Icon
                  className={`mt-0.5 size-4 shrink-0 ${STATUS_CLASS[entry.status]}`}
                />
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <span>{entry.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  {entry.message && (
                    <span className="text-muted-foreground text-xs">
                      {entry.message}
                    </span>
                  )}
                  {entry.signature && (
                    <a
                      href={explorerTxUrl(entry.signature)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                    >
                      View transaction <ExternalLink className="size-3" />
                    </a>
                  )}
                  {entry.bundleId && (
                    <span className="text-muted-foreground text-xs">
                      Bundle {entry.bundleId}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
