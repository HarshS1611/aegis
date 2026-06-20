import Link from "next/link"
import { GitFork, ShieldCheck } from "lucide-react"

import { WalletConnectButton } from "@/components/wallet-connect-button"
import { Button } from "@/components/ui/button"
import { GITHUB_URL } from "@/lib/constants"

export function SiteHeader({ showLaunch = true }: { showLaunch?: boolean }) {
  return (
    <header className="flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <ShieldCheck className="size-6" />
        <div>
          <p className="text-xl font-semibold leading-none">Aegis</p>
          <p className="text-muted-foreground text-xs">
            Social-recovery vault on Solana
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2">
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
