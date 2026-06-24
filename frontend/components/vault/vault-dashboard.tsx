"use client"

import { useMemo } from "react"
import { useSelectedWalletAccount } from "@solana/react"
import { useWalletAccountTransactionSendingSigner } from "@solana/react"
import { address as toAddress, type Account, type Address } from "@solana/kit"

import { Skeleton } from "@/components/ui/skeleton"
import { useGuardianVaults, useVault } from "@/hooks/use-vault"
import { SOLANA_CHAIN } from "@/lib/solana/config"
import type { Vault } from "@/lib/generated"

import { GuardianPanel } from "./guardian-panel"
import { InitializeVaultCard } from "./initialize-vault-card"
import { OwnerPanel } from "./owner-panel"
import { VaultOverview } from "./vault-overview"

function ConnectedDashboard({ address }: { address: Address }) {
  const selectedWalletAccount = useSelectedWalletAccount()[0]!
  const signer = useWalletAccountTransactionSendingSigner(
    selectedWalletAccount,
    SOLANA_CHAIN
  )
  const { vaultAddress, account, isLoading, error, refetch } = useVault(address)
  const related = useGuardianVaults(address)

  if ((isLoading || related.isLoading) && !account && related.vaults.length === 0) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>
  }

  if (related.error) {
    return <p className="text-destructive text-sm">{related.error}</p>
  }

  const refetchAll = async () => {
    await Promise.all([refetch(), related.refetch()])
  }

  const vaultMap = new Map<string, Account<Vault>>()
  if (account?.exists && vaultAddress) {
    vaultMap.set(vaultAddress, account)
  }
  for (const v of related.vaults) {
    vaultMap.set(v.address, v)
  }
  const vaults = [...vaultMap.values()]

  return (
    <div className="grid gap-4">
      {vaults.map((vault) => {
        const isOwner = vault.data.owner === address
        const isGuardian = vault.data.guardians.includes(address)
        return (
          <div key={vault.address} className="grid gap-4 lg:grid-cols-2">
            <VaultOverview vault={vault} vaultAddress={vault.address} />
            <div className="grid gap-4">
              {isOwner && (
                <OwnerPanel
                  vaultAddress={vault.address}
                  vault={vault.data}
                  signer={signer}
                  onSuccess={refetchAll}
                />
              )}
              {isGuardian && (
                <GuardianPanel
                  vaultAddress={vault.address}
                  vault={vault.data}
                  signer={signer}
                  onSuccess={refetchAll}
                />
              )}
              {!isOwner && !isGuardian && (
                <p className="text-muted-foreground text-sm">
                  This wallet is neither the owner nor a guardian of this vault.
                </p>
              )}
            </div>
          </div>
        )
      })}
      {!account?.exists && (
        <InitializeVaultCard signer={signer} onSuccess={refetch} />
      )}
    </div>
  )
}

export function VaultDashboard() {
  const [selectedWalletAccount] = useSelectedWalletAccount()

  const address = useMemo(() => {
    if (!selectedWalletAccount) return null
    return toAddress(selectedWalletAccount.address)
  }, [selectedWalletAccount])

  if (!address) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">
          Connect a wallet to view or create your Aegis vault.
        </p>
      </div>
    )
  }

  return <ConnectedDashboard key={address} address={address} />
}
