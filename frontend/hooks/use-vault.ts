"use client"

import { useCallback, useEffect, useState } from "react"
import type { Account, Address, MaybeAccount } from "@solana/kit"

import type { Vault } from "@/lib/generated"
import { fetchVaultAccount, findRelatedVaults } from "@/lib/solana/vault"

export type VaultState = {
  vaultAddress: Address | null
  account: MaybeAccount<Vault> | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useVault(owner: Address | undefined): VaultState {
  const [vaultAddress, setVaultAddress] = useState<Address | null>(null)
  const [account, setAccount] = useState<MaybeAccount<Vault> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!owner) {
      setVaultAddress(null)
      setAccount(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchVaultAccount(owner)
      setVaultAddress(result.vaultAddress)
      setAccount(result.account)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch vault")
    } finally {
      setIsLoading(false)
    }
  }, [owner])

  useEffect(() => {
    const timeoutId = setTimeout(() => void refetch(), 0)
    return () => clearTimeout(timeoutId)
  }, [refetch])

  return { vaultAddress, account, isLoading, error, refetch }
}

export type GuardianVaultsState = {
  vaults: Account<Vault>[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Finds vaults (other than `address`'s own PDA) where `address` is either
 * the current owner (e.g. rotated in via recovery, with no PDA of their
 * own) or a registered guardian.
 */
export function useGuardianVaults(address: Address | undefined): GuardianVaultsState {
  const [vaults, setVaults] = useState<Account<Vault>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!address) {
      setVaults([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      setVaults(await findRelatedVaults(address))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch related vaults")
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    const timeoutId = setTimeout(() => void refetch(), 0)
    return () => clearTimeout(timeoutId)
  }, [refetch])

  return { vaults, isLoading, error, refetch }
}
