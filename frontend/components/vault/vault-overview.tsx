"use client"

import { isSome } from "@solana/kit"
import type { Account } from "@solana/kit"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { explorerAddressUrl } from "@/lib/solana/config"
import { RecoveryState, type Vault } from "@/lib/generated"

function formatDuration(seconds: bigint) {
  const total = Number(seconds)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function formatTimestamp(seconds: bigint) {
  if (seconds === BigInt(0)) return "never"
  return new Date(Number(seconds) * 1000).toLocaleString()
}

function AddressLink({ address }: { address: string }) {
  return (
    <a
      href={explorerAddressUrl(address)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs break-all underline-offset-4 hover:underline"
    >
      {address}
    </a>
  )
}

export function VaultOverview({
  vault,
  vaultAddress,
}: {
  vault: Account<Vault>
  vaultAddress: string
}) {
  const data = vault.data
  const inRecovery = data.recoveryState === RecoveryState.RecoveryPending

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Vault</CardTitle>
          <Badge variant={inRecovery ? "destructive" : "secondary"}>
            {inRecovery ? "Recovery pending" : "Idle"}
          </Badge>
        </div>
        <CardDescription>
          <AddressLink address={vaultAddress} />
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 sm:col-span-2">
            <p className="text-muted-foreground">Owner</p>
            <AddressLink address={data.owner} />
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground">Threshold</p>
            <p>
              {data.threshold} of {data.guardians.length} guardians
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground">Inactivity window</p>
            <p>{formatDuration(data.inactivityWindow)}</p>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <p className="text-muted-foreground">Last activity</p>
            <p>{formatTimestamp(data.lastActivity)}</p>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-muted-foreground mb-2">
            Guardians ({data.guardians.length})
          </p>
          {data.guardians.length === 0 ? (
            <p className="text-muted-foreground text-xs">No guardians yet</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.guardians.map((g) => (
                <li key={g}>
                  <AddressLink address={g} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {inRecovery && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-2">Recovery in progress</p>
              <div className="grid gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Proposed owner
                  </p>
                  {isSome(data.proposedOwner) ? (
                    <AddressLink address={data.proposedOwner.value} />
                  ) : (
                    <p className="text-xs">none</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    Approvals ({data.approvals.length}/{data.threshold})
                  </p>
                  <ul className="flex flex-col gap-1">
                    {data.approvals.map((a) => (
                      <li key={a}>
                        <AddressLink address={a} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Initiated at</p>
                  <p className="text-xs">{formatTimestamp(data.initiatedAt)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
