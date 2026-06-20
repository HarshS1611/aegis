import Link from "next/link"
import { GitFork, ShieldCheck } from "lucide-react"

import { WalletConnectButton } from "@/components/wallet-connect-button"
import { Button } from "@/components/ui/button"
import { GITHUB_URL } from "@/lib/constants"

export function SiteHeader({ showLaunch = true }: { showLaunch?: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="flex min-w-0 items-center gap-2">
        <ShieldCheck className="size-6 shrink-0" />
        <div className="min-w-0">
          <p className="text-xl font-semibold leading-none">Aegis</p>
          <p className="text-muted-foreground truncate text-xs">
            Social-recovery vault on Solana
          </p>
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        {showLaunch && (
          <Button variant="outline" asChild>
            <Link href="/app">Launch app</Link>
          </Button>
        )}
        <Button variant="outline" size="icon" asChild>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub">
            <GitFork className="size-4" />
          </a>
        </Button>
        <WalletConnectButton />
      </div>
    </header>
  )
}
