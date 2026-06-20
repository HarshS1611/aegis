"use client"

import { useMemo } from "react"
import { useSelectedWalletAccount } from "@solana/react"
import { useWalletAccountTransactionSendingSigner } from "@solana/react"
import { address as toAddress, type Address } from "@solana/kit"

import { Skeleton } from "@/components/ui/skeleton"
import { useGuardianVaults, useVault } from "@/hooks/use-vault"
import { SOLANA_CHAIN } from "@/lib/solana/config"

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
  const guardianVaults = useGuardianVaults(address)

  if ((isLoading || guardianVaults.isLoading) && !account) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>
  }

  if (!account?.exists || !vaultAddress) {
    if (guardianVaults.error) {
      return <p className="text-destructive text-sm">{guardianVaults.error}</p>
    }

    if (guardianVaults.vaults.length > 0) {
      return (
        <div className="grid gap-4">
          {guardianVaults.vaults.map((guardianVault) => {
            const isNowOwner = guardianVault.data.owner === address
            return (
              <div key={guardianVault.address} className="grid gap-4 lg:grid-cols-2">
                <VaultOverview
                  vault={guardianVault}
                  vaultAddress={guardianVault.address}
                />
                <div className="grid gap-4">
                  {isNowOwner && (
                    <OwnerPanel
                      vaultAddress={guardianVault.address}
                      vault={guardianVault.data}
                      signer={signer}
                      onSuccess={() => void guardianVaults.refetch()}
                    />
                  )}
                  <GuardianPanel
                    vaultAddress={guardianVault.address}
                    vault={guardianVault.data}
                    signer={signer}
                    onSuccess={() => void guardianVaults.refetch()}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    return <InitializeVaultCard signer={signer} onSuccess={refetch} />
  }

  const vault = account.data
  const isOwner = vault.owner === address
  const isGuardian = vault.guardians.includes(address)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <VaultOverview vault={account} vaultAddress={vaultAddress} />
      <div className="grid gap-4">
        {isOwner && (
          <OwnerPanel
            vaultAddress={vaultAddress}
            vault={vault}
            signer={signer}
            onSuccess={refetch}
          />
        )}
        {isGuardian && (
          <GuardianPanel
            vaultAddress={vaultAddress}
            vault={vault}
            signer={signer}
            onSuccess={refetch}
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
