"use client"

import { useMemo, useState } from "react"
import { useConnect, useDisconnect, useWallets } from "@wallet-standard/react"
import type { UiWallet, UiWalletAccount } from "@wallet-standard/react"
import { useSelectedWalletAccount } from "@solana/react"
import { LogOut, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function shortenAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function WalletListItem({
  wallet,
  onConnected,
}: {
  wallet: UiWallet
  onConnected: (account: UiWalletAccount) => void
}) {
  const [isConnecting, connect] = useConnect(wallet)

  return (
    <button
      type="button"
      disabled={isConnecting}
      onClick={async () => {
        try {
          const accounts = await connect()
          if (accounts[0]) onConnected(accounts[0])
        } catch (error) {
          console.error("Failed to connect wallet", error)
        }
      }}
      className="flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
    >
      {wallet.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={wallet.icon} alt="" className="size-6 rounded" />
      ) : (
        <Wallet className="size-6" />
      )}
      <span className="font-medium">{wallet.name}</span>
      {isConnecting && (
        <span className="text-muted-foreground ml-auto text-xs">
          Connecting...
        </span>
      )}
    </button>
  )
}

export function WalletConnectButton() {
  const allWallets = useWallets()
  const wallets = useMemo(() => {
    const seen = new Set<string>()
    return allWallets.filter((wallet) => {
      if (seen.has(wallet.name)) return false
      seen.add(wallet.name)
      return true
    })
  }, [allWallets])
  const [selectedWalletAccount, setSelectedWalletAccount] =
    useSelectedWalletAccount()
  const [open, setOpen] = useState(false)

  if (selectedWalletAccount) {
    const wallet = wallets.find((w) =>
      w.accounts.some((a) => a.address === selectedWalletAccount.address)
    )
    if (wallet) {
      return (
        <DisconnectButton
          wallet={wallet}
          account={selectedWalletAccount}
          onDisconnected={() => setSelectedWalletAccount(undefined)}
        />
      )
    }
    return (
      <Button
        variant="outline"
        onClick={() => setSelectedWalletAccount(undefined)}
      >
        <span className="font-mono">
          {shortenAddress(selectedWalletAccount.address)}
        </span>
        <LogOut className="size-4" />
      </Button>
    )
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Wallet className="size-4" />
        Connect Wallet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect a wallet</DialogTitle>
            <DialogDescription>
              Choose a Solana wallet to connect to Aegis.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {wallets.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No Solana wallets found. Install Phantom, Solflare, or
                another Wallet Standard compatible wallet.
              </p>
            )}
            {wallets.map((wallet) => (
              <WalletListItem
                key={wallet.name}
                wallet={wallet}
                onConnected={(account) => {
                  setSelectedWalletAccount(account)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DisconnectButton({
  wallet,
  account,
  onDisconnected,
}: {
  wallet: UiWallet
  account: UiWalletAccount
  onDisconnected: () => void
}) {
  const [isDisconnecting, disconnect] = useDisconnect(wallet)

  return (
    <Button
      variant="outline"
      disabled={isDisconnecting}
      onClick={async () => {
        try {
          await disconnect()
        } catch (error) {
          console.error("Failed to disconnect wallet", error)
        } finally {
          onDisconnected()
        }
      }}
    >
      <span className="font-mono">{shortenAddress(account.address)}</span>
      <LogOut className="size-4" />
    </Button>
  )
}
