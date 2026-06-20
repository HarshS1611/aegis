"use client"

import { SelectedWalletAccountContextProvider } from "@solana/react"
import type { UiWallet } from "@wallet-standard/react"
import { SolanaSignAndSendTransaction } from "@solana/wallet-standard-features"
import { StandardConnect, StandardDisconnect } from "@wallet-standard/features"

import { SOLANA_CHAIN } from "@/lib/solana/config"

const STORAGE_KEY = "aegis:selected-wallet-account"

function filterWallets(wallet: UiWallet): boolean {
  if (!wallet.chains.includes(SOLANA_CHAIN) && !wallet.chains.includes("solana:mainnet")) {
    return false
  }
  if (!wallet.features.includes(StandardConnect)) return false
  if (!wallet.features.includes(StandardDisconnect)) return false
  if (!wallet.features.includes(SolanaSignAndSendTransaction)) return false
  return true
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <SelectedWalletAccountContextProvider
      filterWallets={filterWallets}
      stateSync={{
        getSelectedWallet: () => {
          if (typeof window === "undefined") return null
          return window.localStorage.getItem(STORAGE_KEY)
        },
        storeSelectedWallet: (accountKey) => {
          if (typeof window === "undefined") return
          window.localStorage.setItem(STORAGE_KEY, accountKey)
        },
        deleteSelectedWallet: () => {
          if (typeof window === "undefined") return
          window.localStorage.removeItem(STORAGE_KEY)
        },
      }}
    >
      {children}
    </SelectedWalletAccountContextProvider>
  )
}
